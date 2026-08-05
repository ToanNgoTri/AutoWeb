'use client'

import dynamic from 'next/dynamic'

/**
 * Trình soạn kịch bản chỉ chạy ở client: nó đọc bản nháp từ localStorage ngay
 * trong initializer của useState, nên không được prerender ở server (sẽ lệch
 * hydrate). ssr:false cho phép làm vậy mà không phải setState trong effect.
 */
const TrinhSoan = dynamic(() => import('./components/trinh-soan'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-sm text-neutral-500">
      Đang tải trình soạn kịch bản…
    </div>
  ),
})

export default function Page() {
  return <TrinhSoan />
}
