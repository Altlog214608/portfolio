# 정적 사이트: S3(비공개) + CloudFront(OAC). 버킷은 CloudFront를 통해서만 읽을 수 있다.

# 버킷 이름에 계정 ID 대신 임의 접미사를 붙인다 (공개 저장소에 계정 ID를 남기지 않기 위해)
resource "random_id" "suffix" {
  byte_length = 4
}

# ---------- S3 ----------

resource "aws_s3_bucket" "web" {
  bucket = "portfolio-web-${random_id.suffix.hex}"
}

resource "aws_s3_bucket_versioning" "web" {
  bucket = aws_s3_bucket.web.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# 배포 때 덮어쓴 이전 버전은 되돌릴 수 있게 30일만 남긴다
resource "aws_s3_bucket_lifecycle_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }

  depends_on = [aws_s3_bucket_versioning.web]
}

data "aws_iam_policy_document" "web_bucket" {
  statement {
    sid       = "AllowCloudFrontRead"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.web.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.web.arn]
    }
  }

  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.web.arn, "${aws_s3_bucket.web.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id
  policy = data.aws_iam_policy_document.web_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.web]
}

# ---------- CloudFront ----------

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = aws_s3_bucket.web.bucket
  description                       = "portfolio web bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# xxxx.cloudfront.net 같은 다른 주소로 들어오면 대표 주소로 301 보낸다 (검색·공유 주소를 하나로)
resource "aws_cloudfront_function" "canonical_host" {
  name    = "portfolio-canonical-host"
  runtime = "cloudfront-js-2.0"
  comment = "Redirect to the canonical host"
  publish = true
  code    = <<-EOT
    var CANONICAL = ${jsonencode(var.site_domain)};

    function handler(event) {
      var request = event.request;
      var host = request.headers.host ? request.headers.host.value : '';
      if (host !== CANONICAL) {
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: { location: { value: 'https://' + CANONICAL + request.uri } },
        };
      }
      return request;
    }
  EOT
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  comment             = "portfolio web"
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = [var.site_domain]

  origin {
    origin_id                = "web"
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  # 캐시 기간은 객체의 Cache-Control을 따른다: html·json은 no-cache, 그 밖은 deploy.yml에서 정한다
  default_cache_behavior {
    target_origin_id           = "web"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.canonical_host.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SNI 방식 ACM 인증서 (전용 IP 방식은 월 $600이라 쓰지 않는다)
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
