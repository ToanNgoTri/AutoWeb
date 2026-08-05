/** Tốc độ diễn: ảnh hưởng mọi khoảng nghỉ, tốc độ gõ chữ và tần số chụp màn hình. */
export type Pace = 'nhanh' | 'vua' | 'cham' | 'rat-cham'

export const PACE_OPTIONS: { value: Pace; label: string; hint: string }[] = [
  { value: 'nhanh', label: 'Nhanh', hint: 'chạy cho xong, gần như không nghỉ' },
  { value: 'vua', label: 'Vừa', hint: 'thấy được từng bước' },
  { value: 'cham', label: 'Chậm', hint: 'đọc kịp từng thao tác' },
  { value: 'rat-cham', label: 'Rất chậm', hint: 'để trình diễn cho người khác xem' },
]
