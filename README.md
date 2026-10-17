# 김동현 포트폴리오

Cloud Engineer · Developer 포트폴리오 사이트입니다. 빌드 과정 없는 정적 사이트이고, AWS에 Terraform으로 배포합니다.

- 사이트: https://portfolio.koicut.com

## 구조

```
index.html              페이지 뼈대 (메타·OG 태그, 섹션 제목)
assets/css/style.css    스타일 (라이트/다크 테마, 모션)
assets/js/common.js     공개 페이지와 관리자 도구가 함께 쓰는 함수
assets/js/main.js       data/portfolio.json을 읽어 화면을 그림
data/portfolio.json     모든 내용 (프로필, 스킬, 프로젝트, 연혁, 자격증)
images/                 프로필·프로젝트 이미지(webp), og.png
admin/                  로컬 전용 관리자 도구 (배포하지 않음)
infra/terraform/        AWS 인프라 (S3, CloudFront, ACM, Route 53, GitHub OIDC 역할)
scripts/deploy.sh       공개 파일만 S3에 올리고 CloudFront 캐시를 비움
.github/workflows/      main에 머지되면 deploy.sh 실행
```

## 아키텍처

```
브라우저 → Route 53 (portfolio.koicut.com, 별칭 레코드)
        → CloudFront (ACM 인증서, HTTPS, 압축, 보안 헤더, 다른 주소는 301)
        → S3 (비공개 버킷, OAC로 CloudFront만 읽기)

main 머지 → GitHub Actions (OIDC 임시 권한, 장기 키 없음) → S3 업로드 + 캐시 무효화
```

- koicut.com 호스팅 영역은 KoiCut 저장소의 Terraform이 관리합니다. 여기서는 조회만 하고 `portfolio` 레코드와 인증서 검증 레코드만 추가합니다.
- Terraform 상태는 KoiCut 상태 버킷의 `portfolio/` 키에 저장합니다. KoiCut CI 역할은 `envs/*`만 읽을 수 있어 서로 섞이지 않습니다.
- GitHub 배포 역할(`portfolio-github-deploy`)은 이 저장소의 main 브랜치에서만 맡을 수 있고, 웹 버킷 객체 쓰기와 캐시 무효화만 할 수 있습니다.

## 로컬에서 보기

`fetch`로 JSON을 읽기 때문에 파일을 더블클릭하면 열리지 않습니다. 로컬 서버로 여세요.

```sh
python -m http.server 8000
```

- 사이트: http://localhost:8000/
- 관리자: http://localhost:8000/admin/

## 내용 수정하기

1. 관리자 도구(`/admin/`)에서 수정합니다. 수정 내용은 브라우저에 초안으로 자동 보관됩니다.
2. **초안 미리보기**로 확인합니다. `index.html?preview`는 이 브라우저의 초안을 보여 줍니다.
3. **사이트에 반영 → 폴더 연결 → 리포에 저장**을 누르면 `data/portfolio.json`과 새 이미지가 리포에 저장됩니다. Chrome·Edge에서 됩니다.
4. 브랜치에 커밋하고 PR을 머지하면 GitHub Actions가 배포합니다.

## 배포

**사이트 파일**: main에 머지하면 자동으로 배포됩니다. 손으로 배포하려면:

```sh
BUCKET=<web_bucket_name> DISTRIBUTION_ID=<distribution_id> bash scripts/deploy.sh
```

캐시: `index.html`·`data/`는 `no-cache`, `assets/`는 1시간, `images/`는 7일. 배포할 때마다 CloudFront 캐시를 모두 비웁니다.

**인프라**: 로컬에서 관리자 프로필로 적용합니다.

```sh
cd infra/terraform
AWS_PROFILE=fitcut terraform init
AWS_PROFILE=fitcut terraform plan
AWS_PROFILE=fitcut terraform apply
```

`terraform output`의 `deploy_role_arn`, `web_bucket_name`, `distribution_id`는 GitHub 저장소 변수 `AWS_DEPLOY_ROLE_ARN`, `WEB_BUCKET`, `DISTRIBUTION_ID`에 들어 있습니다.

**주소 바꾸기**: 개인 도메인이 생기면 `variables.tf`의 `zone_name`·`site_domain`과 `index.html`의 `canonical`·`og:url`·`og:image`를 바꿉니다.

**비용**: 이 정도 트래픽이면 S3·CloudFront·ACM 모두 거의 0원입니다. 호스팅 영역은 KoiCut과 같이 쓰므로 추가 비용이 없습니다.
