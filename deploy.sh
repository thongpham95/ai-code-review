#!/bin/bash
# Script hỗ trợ build và push lên Docker Hub an toàn

echo "=== 🚀 AI Code Review - Docker Hub Deploy ==="
echo "Script này sẽ build và push image lên Docker Hub, đảm bảo KHÔNG bao gồm các file .env chứa keys"

# Tự động cấu hình Docker Hub Username
DH_USERNAME="thongphm"

# Kiểm tra xem Docker đã được cài đặt và đang chạy chưa
if ! command -v docker &> /dev/null; then
    echo "❌ LỖI: Không tìm thấy lệnh 'docker'."
    echo "💡 Trên Mac, bạn cần cài đặt và bật phần mềm Docker Desktop hoặc OrbStack."
    echo "👉 Tải Docker Desktop tại: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

IMAGE_NAME="$DH_USERNAME/ai-codereview:latest"

echo ""
echo "📦 Đang tiến hành build image: $IMAGE_NAME"
echo "✅ File .env.local, AUTH_SECRET, và API KEY sẽ tự động bị loại bỏ (nhờ file .dockerignore)"
echo ""

# Build cho kiến trúc amd64 (Server AWS/Ubuntu thông dụng)
docker build --platform linux/amd64 -t "$IMAGE_NAME" .

if [ $? -eq 0 ]; then
  echo "✅ Build thành công!"
else
  echo "❌ Có lỗi xảy ra trong quá trình build."
  exit 1
fi

echo ""
echo "🔐 Đang đăng nhập Docker Hub (Nếu bạn đã đăng nhập, có thể sẽ không cần mật khẩu)..."
docker login

echo ""
echo "☁️ Đang tải (push) image lên Docker Hub..."
docker push "$IMAGE_NAME"

if [ $? -eq 0 ]; then
  echo ""
  echo "🎉 HOÀN TẤT! Image đã có sẵn trên Docker Hub tại: https://hub.docker.com/repository/docker/$DH_USERNAME/ai-codereview"
  echo ""
  echo "💡 Hướng dẫn chạy trên Server Production:"
  echo "1. Copy file 'docker-compose.prod.yml' lên server."
  echo "2. Tạo file '.env' trên server, chứa các secret như:"
  echo "   AUTH_SECRET=..."
  echo "   GOOGLE_GENERATIVE_AI_API_KEY=..."
  echo "   AUTH_URL=https://your-domain.com"
  echo "   DH_USERNAME=$DH_USERNAME"
  echo "3. Chạy lệnh: docker-compose -f docker-compose.prod.yml up -d"
else
  echo "❌ Lỗi khi push lên Docker Hub."
fi
