#!/usr/bin/env bash
# 공개할 파일만 S3에 올리고 CloudFront 캐시를 비운다. GitHub Actions와 로컬에서 같이 쓴다.
#   BUCKET=portfolio-web-xxxx DISTRIBUTION_ID=EXXXX bash scripts/deploy.sh
# admin/, infra/, scripts/, README.md 같은 파일은 올리지 않는다 (올릴 것만 골라서 올림).
set -euo pipefail
: "${BUCKET:?BUCKET이 필요합니다}" "${DISTRIBUTION_ID:?DISTRIBUTION_ID가 필요합니다}"

cd "$(dirname "$0")/.."
s3="s3://${BUCKET}"

# 이미지는 바뀌면 파일 이름이 바뀌므로(관리자 도구가 새 이름으로 저장) 오래 캐시한다
aws s3 sync images "${s3}/images" --delete --cache-control "public, max-age=604800"
# CSS·JS는 파일 이름에 해시가 없어 짧게 캐시한다
aws s3 sync assets "${s3}/assets" --delete --cache-control "public, max-age=3600"
# 내용(JSON)과 페이지는 매번 새로 확인한다
aws s3 sync data "${s3}/data" --delete --cache-control "no-cache"
aws s3 cp index.html "${s3}/index.html" --cache-control "no-cache"
aws s3 cp favicon.svg "${s3}/favicon.svg" --cache-control "public, max-age=86400"

# "/*" 하나는 무효화 경로 1개로 계산된다 (월 1,000개 무료)
aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" --paths "/*" \
  --query 'Invalidation.Id' --output text
