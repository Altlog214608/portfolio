variable "zone_name" {
  description = "이미 있는 Route 53 호스팅 영역 (KoiCut Terraform이 관리)"
  type        = string
  default     = "koicut.com"
}

variable "site_domain" {
  description = "포트폴리오 주소. 개인 도메인이 생기면 이 값(과 zone_name)만 바꾼다"
  type        = string
  default     = "portfolio.koicut.com"
}

variable "github_oidc_subject_prefix" {
  description = <<-EOT
    배포 역할을 맡을 수 있는 GitHub 저장소의 OIDC sub 클레임 접두사.
    immutable subject 형식(repo:OWNER@OWNER-ID/REPO@REPO-ID)이라 저장소 이름이 바뀌거나
    같은 이름으로 다시 만들어져도 신뢰가 넘어가지 않는다.
    확인: gh api repos/Altlog214608/portfolio/actions/oidc/customization/sub
  EOT
  type        = string
  default     = "repo:Altlog214608@186117655/portfolio@1405704042"
}

variable "price_class" {
  description = "PriceClass_200은 한국·일본 등 아시아 엣지를 포함한다 (PriceClass_100은 북미·유럽만)"
  type        = string
  default     = "PriceClass_200"
}
