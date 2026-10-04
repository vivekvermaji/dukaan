/** Downscale a camera photo to a small JPEG data URL (about 30 KB) before it is sent. */
export function shrinkPhoto(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.6))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}
