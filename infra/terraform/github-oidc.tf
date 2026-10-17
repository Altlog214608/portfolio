# GitHub Actions가 장기 액세스 키 없이 OIDC로 배포 역할을 맡는다.
# OIDC 공급자는 계정에 하나만 둘 수 있어 KoiCut bootstrap이 만든 것을 그대로 쓴다.
# 이 역할은 main 브랜치에서만 맡을 수 있고, 웹 버킷 객체 올리기와 캐시 무효화만 할 수 있다.
# 인프라 변경(terraform apply)은 로컬에서 관리자 프로필로 한다.

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/main"]
    }
  }
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "ListWebBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.web.arn]
  }

  statement {
    sid       = "SyncWebObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.web.arn}/*"]
  }

  statement {
    sid       = "InvalidateCache"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.web.arn]
  }
}

resource "aws_iam_role" "deploy" {
  name               = "portfolio-github-deploy"
  description        = "GitHub Actions: upload the portfolio site and invalidate CloudFront from main"
  assume_role_policy = data.aws_iam_policy_document.github_trust.json
}

resource "aws_iam_role_policy" "deploy" {
  name   = "web-deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
