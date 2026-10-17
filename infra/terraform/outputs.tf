output "url" {
  value = "https://${var.site_domain}"
}

output "web_bucket_name" {
  value = aws_s3_bucket.web.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.web.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.web.domain_name
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}
