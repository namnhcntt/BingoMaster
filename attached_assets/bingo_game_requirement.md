## Yêu cầu nghiệp vụ

### 1. Quản lý người dùng
- **Quản trị viên**:
  - Tạo, sửa, xóa tài khoản người dùng (thông tin: tên, email, mật khẩu).
  - Reset mật khẩu người dùng (gửi email hoặc cập nhật trực tiếp).
  - Xem danh sách người dùng với thông tin cơ bản (tên, email, thời gian đăng ký, trạng thái hoạt động).
- **Người dùng**:
  - Đăng ký tài khoản mới (email, mật khẩu, tên hiển thị).
  - Đăng nhập/đăng xuất.
  - Xem và cập nhật thông tin cá nhân (tên hiển thị, email).

### 2. Quản lý API Provider (Yêu cầu bổ sung)
- **Chức năng**:
  - Quản trị viên có thể thêm, sửa, xóa thông tin provider (ví dụ: OpenAI, OpenRouter, DeepSeek).
  - Nhập và lưu trữ API Key cho từng provider.
  - Chọn provider active (chỉ một provider được kích hoạt tại một thời điểm).
- **Mục đích**:
  - Linh hoạt tích hợp với các dịch vụ API tạo nội dung, dễ dàng chuyển đổi provider khi cần.

### 3. Tạo trò chơi Bingo
- **Người tạo trò chơi (bất kỳ người dùng đã đăng nhập)**:
  - Tạo trò chơi mới với các thông tin cấu hình:
    - **Kích thước ô Bingo**: Mặc định 5x5, tùy chỉnh (3x3, 4x4, 6x6, v.v.).
    - **Kích thước 1 ô**: Tùy chọn small, medium, large, xlarge, xxlarge (ảnh hưởng đến giao diện hiển thị).
    - **Thời gian trả lời**: Thời gian tối đa (tính bằng giây) để người chơi chọn đáp án (ví dụ: 10s, 30s, 60s).
    - **Số nhóm**: Số nhóm tham gia (tối thiểu 1, tối đa tùy hiệu suất hệ thống). Các từ tiếng Nhật được phân phối ngẫu nhiên vào ô của các nhóm.
    - **Cặp câu hỏi - đáp án**: Hai cách nhập:
      - **Nhập thủ công**: Người tạo nhập danh sách cặp câu hỏi (tiếng Nhật) và đáp án (tiếng Nhật hoặc tiếng Việt).
      - **Tạo nhanh từ prompt** (yêu cầu bổ sung): Người tạo nhập prompt (ví dụ: *"Tạo bingo board với các từ hiragana ứng với trình độ N5"*), hệ thống gửi đến API provider active, nhận danh sách câu hỏi/đáp án, và cho phép chỉnh sửa trước khi lưu.
    - Đáp án nếu quá dài sẽ tự động giảm kích thước chữ hoặc wrap text để không tràn ô.
  - Sau khi tạo, hệ thống sinh **link mời** (URL duy nhất) để gửi cho người chơi tham gia.

### 4. Tham gia trò chơi
- **Người chơi**:
  - Trước khi tham gia, cần nhập tên hiển thị (không cần đăng nhập nếu không muốn, nhưng cần tên để phân biệt).
  - Khi tham gia qua link, được phân phối ngẫu nhiên vào một trong các nhóm đã tạo.

### 5. Quản lý trò chơi
- **Người tạo trò chơi**:
  - Có nút **"Bắt đầu"** để khởi động trò chơi (câu hỏi đầu tiên hiển thị cho tất cả người chơi).
  - Có nút **"Kết thúc"** để dừng trò chơi bất kỳ lúc nào (kết quả được tổng hợp ngay lập tức).
  - Xem kết quả chọn đáp án của từng nhóm theo thời gian thực.
  - Có bảng Bingo riêng (nhóm n + 1, với n là số nhóm người chơi), được sinh ngẫu nhiên.
  - Chọn câu hỏi từ danh sách đã nhập để hiển thị cho người chơi trả lời (mỗi câu hỏi đi kèm thời gian đếm ngược theo cấu hình).

### 6. Luật chơi
- **Chọn đáp án**:
  - Mỗi người chơi trong nhóm có thể chọn hoặc bỏ chọn đáp án trên ô của mình trong thời gian cho phép.
  - Đáp án chính thức của nhóm là đáp án được nhiều người chọn nhất.
  - Nếu có nhiều đáp án được chọn với số lượng bằng nhau, đáp án được chọn sớm nhất (theo timestamp) được lấy làm đáp án chính thức.
- **Bingo**:
  - Khi một nhóm hoàn thành một hàng ngang, dọc hoặc chéo (tùy cấu hình kích thước ô), nhóm đó tự động đạt Bingo.
  - Trò chơi kết thúc khi người tạo nhấn "Kết thúc" hoặc tất cả câu hỏi đã được trả lời. Kết quả hiển thị:
    - Danh sách các nhóm đạt Bingo, sắp xếp theo thứ tự thời gian đạt Bingo (nhóm sớm nhất ở trên cùng).
    - Danh sách tên thành viên của từng nhóm kèm trạng thái Bingo của nhóm.

---

## Yêu cầu kỹ thuật

### 1. Techstack
- **Frontend**: React
  - Xây dựng giao diện người dùng động và responsive.
- **Backend**: Node.js
  - Xử lý logic nghiệp vụ và cung cấp API cho frontend.
- **Database**: SQLite
  - Lưu trữ dữ liệu dưới dạng file embed trong backend, không cần server database riêng.

### 2. Cấu trúc hệ thống
- **Frontend**:
  - Giao diện cho:
    - Quản trị viên: Quản lý người dùng và API provider.
    - Người tạo trò chơi: Tạo và quản lý trò chơi, nhập prompt, chỉnh sửa câu hỏi/đáp án.
    - Người chơi: Tham gia và chọn đáp án.
  - Responsive để hỗ trợ các thiết bị khác nhau (desktop, tablet, mobile).
- **Backend**:
  - **API RESTful** để xử lý các yêu cầu từ frontend (đăng ký, tạo trò chơi, tham gia, chọn đáp án, quản lý provider).
  - Logic phân phối ngẫu nhiên nhóm, từ tiếng Nhật, và đáp án.
  - Tích hợp API bên thứ ba (OpenAI, OpenRouter, DeepSeek) để tạo câu hỏi từ prompt.
- **Database**:
  - SQLite lưu trữ:
    - **Người dùng**: `id`, `email`, `password`, `display_name`.
    - **Trò chơi**: `id`, `config` (kích thước, thời gian, số nhóm), `questions_answers`, `status`.
    - **Nhóm**: `id`, `game_id`, `players`, `bingo_board`, `results`.
    - **API Provider** (bổ sung): `id`, `provider_name`, `api_key`, `is_active`.

### 3. Tính năng chi tiết
- **Quản lý người dùng**:
  - API cho đăng ký, đăng nhập, đăng xuất (sử dụng **JWT** để xác thực).
  - API cho quản trị viên: CRUD người dùng, reset mật khẩu.
- **Quản lý API Provider** (bổ sung):
  - API CRUD để quản trị viên thêm, sửa, xóa provider.
  - API để kích hoạt provider (đặt `is_active = true` cho provider được chọn, `false` cho các provider khác).
- **Tạo trò chơi**:
  - Giao diện nhập cấu hình (kích thước ô, thời gian, số nhóm, câu hỏi - đáp án).
  - Hai cách nhập câu hỏi:
    - **Nhập thủ công**: Form nhập danh sách cặp câu hỏi - đáp án.
    - **Tạo nhanh từ prompt**:
      - Ô nhập prompt và nút "Tạo nhanh".
      - Gửi prompt đến API provider active, nhận danh sách câu hỏi/đáp án.
      - Hiển thị danh sách để người tạo chỉnh sửa (thêm, xóa, sửa).
  - Backend sinh bảng Bingo ngẫu nhiên cho từng nhóm và lưu cấu hình.
  - Sinh link mời duy nhất (dạng `/game/:gameId`).
- **Tham gia trò chơi**:
  - Giao diện nhập tên hiển thị trước khi tham gia.
  - Backend phân phối người chơi ngẫu nhiên vào các nhóm.
- **Quản lý trò chơi**:
  - API bắt đầu/kết thúc trò chơi.
  - API lấy kết quả chọn đáp án theo thời gian thực (khuyến nghị dùng **WebSocket** để tối ưu).
  - Giao diện hiển thị bảng Bingo của người tạo (nhóm n + 1).
- **Luật chơi**:
  - Backend xử lý logic chọn đáp án: đếm số lượt chọn, xác định đáp án chính thức.
  - Kiểm tra điều kiện Bingo (hàng, cột, chéo) sau mỗi lượt trả lời.

### 4. Yêu cầu phi chức năng

- Trò chơi cần có giao diện bắt mắt để thu hút người chơi (đối tượng người chơi là học sinh, sinh viên và trung niên đang đi làm)
- Hệ thống nhập liệu cần cực kỳ thuận tiện để thêm / cập nhật nhiều câu hỏi / đáp án trên 1 form
- Khi bắt đầu trò chơi cần có nhiều animation để tạo hứng thú khi chơi


### 5. Công nghệ cụ thể
- **Frontend**:
  - **React**: Xây dựng giao diện.
  - **Redux**: Quản lý trạng thái (state) của trò chơi, người dùng, danh sách câu hỏi/đáp án.
  - **React Router**: Điều hướng giữa các trang (đăng nhập, tạo trò chơi, chơi game).
- **Backend**:
  - **Express.js**: Framework cho API.
  - **Sequelize**: ORM để tương tác với SQLite.
  - **Axios/Fetch**: Gửi request đến API provider (OpenAI, OpenRouter, DeepSeek).
  - **WebSocket** (tùy chọn): Cập nhật realtime kết quả chọn đáp án và trạng thái Bingo.
- **Database**:
  - **SQLite**: Lưu trữ dữ liệu dạng file.

### 6. Yêu cầu bảo mật và xử lý lỗi
- **Bảo mật**:
  - Sử dụng **JWT** để xác thực và phân quyền (quản trị viên/người dùng).
  - Mã hóa mật khẩu bằng **bcrypt**.
  - API Key của provider được lưu an toàn trong database (có thể mã hóa).
  - Chỉ quản trị viên có quyền truy cập và quản lý provider/API Key.
- **Xử lý lỗi**:
  - Nếu API provider không phản hồi hoặc trả về lỗi, hiển thị thông báo cho người dùng (ví dụ: "Không thể tạo câu hỏi, vui lòng thử lại").
  - Đảm bảo giao diện không crash khi API gặp sự cố.

### 7. Triển khai
- **Development**:
  - Dùng **Docker** để tạo môi trường phát triển đồng nhất.
- **Production**:
  - Triển khai trên server đơn giản (VPS) hoặc cloud (Heroku, AWS) với file SQLite embed.

### 8. Ví dụ minh họa (Tạo nhanh từ prompt)
- **Prompt**: *"Tạo bingo board với các từ hiragana ứng với trình độ N5"*.
- **Kết quả từ API (giả định)**:
  - あ (a) - Đáp án: Âm "a".
  - い (i) - Đáp án: Âm "i".
  - う (u) - Đáp án: Âm "u".
  - (Danh sách tiếp tục với các từ hiragana khác).
- **Chỉnh sửa**:
  - Người tạo có thể thay đổi, ví dụ: あ (a) - Đáp án: "Apple" (nếu muốn thêm nghĩa tiếng Anh).
- **Lưu trữ**:
  - Sau khi chỉnh sửa, danh sách được lưu vào trò chơi Bingo.