provider "aws" {
  region = "ap-northeast-2"

  default_tags {
    tags = {
      Project   = "portfolio"
      Component = "portfolio"
    }
  }
}
