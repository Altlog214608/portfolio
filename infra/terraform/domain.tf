# koicut.com 호스팅 영역은 KoiCut Terraform이 만들고 관리한다. 여기서는 조회만 하고 레코드만 추가한다.
data "aws_route53_zone" "this" {
  name         = var.zone_name
  private_zone = false
}

# CloudFront는 us-east-1 인증서만 쓴다 (provider 6의 리소스별 region)
resource "aws_acm_certificate" "site" {
  region            = "us-east-1"
  domain_name       = var.site_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for o in aws_acm_certificate.site.domain_validation_options : o.domain_name => o
  }

  zone_id         = data.aws_route53_zone.this.zone_id
  name            = each.value.resource_record_name
  type            = each.value.resource_record_type
  records         = [each.value.resource_record_value]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  region                  = "us-east-1"
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# CloudFront를 가리키는 별칭 레코드 (IPv4·IPv6). CloudFront 별칭 조회는 요금이 없다
resource "aws_route53_record" "site" {
  for_each = toset(["A", "AAAA"])

  zone_id = data.aws_route53_zone.this.zone_id
  name    = var.site_domain
  type    = each.value

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = aws_cloudfront_distribution.web.hosted_zone_id
    evaluate_target_health = false
  }
}
