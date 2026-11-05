# Quy Chuẩn Thiết Kế Giao Diện UI & Design Tokens

**Gói định nghĩa:** [`packages/ui-tokens`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/ui-tokens)  
**Chỉ thị thiết kế:** Protocol: Premium Utilitarian Minimalism & Editorial UI ([`reference-docs/SKILL_UI.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/reference-docs/SKILL_UI.md))  

---

## 1. NGUYÊN TẮC THIẾT KẾ CỐT LÕI (DESIGN DIRECTIVES)

Giao diện của nền tảng Acad mang phong cách **Tối giản biên tập (Editorial Minimalism)** và **Khối bento chức năng (Bento Grids)**:
- **KHÔNG** sử dụng shadow quá đậm (chỉ dùng đường viền siêu mảnh `border: 1px solid #EAEAEA` hoặc độ mờ < 0.04).
- **KHÔNG** sử dụng gradient lòe loẹt, hiệu ứng kính mờ 3D rẻ tiền hay màu nền neon sặc sỡ.
- **KHÔNG** dùng emoji trong nội dung hệ thống hoặc tiêu đề, thay thế bằng các icon đường nét chuẩn (Phosphor / Radix UI Icons).
- **KHÔNG** dùng font chữ SaaS đại trà (Inter, Roboto, Open Sans) cho tiêu đề biên tập; ưu tiên font editorial serif cho tiêu đề và font mono cho các đoạn mã / dữ liệu kỹ thuật.

---

## 2. MA TRẬN DESIGN TOKENS

### 2.1. Lưới Bố Cục & Điểm Ngắt (Breakpoints)
```typescript
export const BREAKPOINTS = {
  mobile_sm: '360px',
  mobile_lg: '480px',
  tablet:    '768px',
  desktop_sm:'1024px',
  desktop_lg:'1280px',
  desktop_xl:'1536px',
} as const;
```

### 2.2. Kích Thước Bố Cục Tiêu Chuẩn (Layout Dimensions)
- Chiều rộng tối đa khung nhìn: `1440px`.
- Chiều cao thanh điều hướng trên cùng (Top Navbar): `56px`.
- Chiều rộng thanh điều hướng bên trái (Left Rail): `240px`.
- Chiều rộng sân khấu nội dung trung tâm (Center Stage): `768px`.
- Chiều rộng cột ngữ cảnh bên phải (Right Rail): `320px`.

### 2.3. Bảng Màu Ngữ Nghĩa (Color Semantics)
```typescript
export const COLOR_SEMANTICS = {
  light: {
    surfaceCanvas:     '#F8FAFC',
    surfaceElevated1:  '#FFFFFF',
    surfaceElevated2:  '#F1F5F9',
    borderSubtle:      '#E2E8F0',
    borderStrong:      '#CBD5E1',
    textPrimary:       '#0F172A',
    textSecondary:     '#475569',
    brandPrimary:      '#2563EB',
    voteUp:            '#EA580C',
    voteDown:          '#4F46E5',
    statusDanger:      '#DC2626',
    statusSuccess:     '#16A34A',
  },
  dark: {
    surfaceCanvas:     '#0B0F17',
    surfaceElevated1:  '#131926',
    surfaceElevated2:  '#1E2638',
    borderSubtle:      '#242F45',
    borderStrong:      '#334155',
    textPrimary:       '#F8FAFC',
    textSecondary:     '#94A3B8',
    brandPrimary:      '#3B82F6',
    voteUp:            '#F97316',
    voteDown:          '#6366F1',
    statusDanger:      '#EF4444',
    statusSuccess:     '#22C55E',
  },
};
```
