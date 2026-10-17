terraform {
  # KoiCut(fitcut)과 같은 계정의 상태 버킷을 쓰고 키만 나눈다.
  # KoiCut CI 역할은 envs/* 키만 읽을 수 있어 이 상태에는 접근하지 못한다.
  backend "s3" {
    bucket       = "fitcut-tfstate-c87f4c6d"
    key          = "portfolio/terraform.tfstate"
    region       = "ap-northeast-2"
    encrypt      = true
    use_lockfile = true
  }
}
