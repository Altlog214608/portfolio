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

variable "github_repository" {
  description = "배포 역할을 맡을 수 있는 GitHub 저장소 (owner/name)"
  type        = string
  default     = "Altlog214608/portfolio"
}

variable "price_class" {
  description = "PriceClass_200은 한국·일본 등 아시아 엣지를 포함한다 (PriceClass_100은 북미·유럽만)"
  type        = string
  default     = "PriceClass_200"
}
