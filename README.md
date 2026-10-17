# 김동현 포트폴리오

Cloud Engineer · Developer 포트폴리오 사이트입니다. 빌드 과정 없는 정적 사이트입니다.

- 사이트: https://altlog214608.github.io/portfolio/

## 구조

```
index.html              페이지 뼈대 (메타·OG 태그, 섹션 제목)
assets/css/style.css    스타일 (라이트/다크 테마)
assets/js/common.js     공개 페이지와 관리자 도구가 함께 쓰는 함수
assets/js/main.js       data/portfolio.json을 읽어 화면을 그림
data/portfolio.json     모든 내용 (프로필, 스킬, 프로젝트, 연혁, 자격증)
images/                 프로필·프로젝트 이미지(webp), og.png
admin/                  로컬 전용 관리자 도구 (배포 제외)
_config.yml             GitHub Pages 빌드에서 admin/ 제외
```

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
4. 커밋하고 push합니다.

`data/portfolio.json`을 직접 고쳐도 됩니다.

## 배포

- 현재: GitHub Pages (main 브랜치 루트, `_config.yml`로 `admin/` 제외)
- 예정: AWS (S3 + CloudFront). 업로드할 때 `admin/`, `README.md`, `_config.yml`은 빼야 합니다.
  배포 도메인이 바뀌면 `index.html`의 `canonical`, `og:url`, `og:image` 주소도 바꿔야 합니다.
