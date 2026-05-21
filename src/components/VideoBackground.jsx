import React, { useEffect, useRef } from 'react'

export default function VideoBackground() {
  const lightRef = useRef(null)
  const darkRef = useRef(null)

  useEffect(() => {
    const vLight = lightRef.current
    const vDark = darkRef.current
    if (!vLight || !vDark) return

    const handleError = (e) => {
      console.warn('[VideoBackground] 视频加载或播放失败', e)
      try {
        vLight.style.opacity = '0'
        vDark.style.opacity = '0'
        vLight.style.display = 'none'
        vDark.style.display = 'none'
      } catch (err) {
        // ignore
      }
      document.documentElement.setAttribute('data-video-status', 'failed')
    }

    const handleCanPlay = () => {
      document.documentElement.setAttribute('data-video-status', 'ready')
      // let CSS control opacity based on theme
      vLight.style.removeProperty('display')
      vDark.style.removeProperty('display')
    }

    vLight.addEventListener('error', handleError)
    vDark.addEventListener('error', handleError)
    vLight.addEventListener('canplay', handleCanPlay)
    vDark.addEventListener('canplay', handleCanPlay)

    // 某些浏览器会阻止 autoplay，尝试播放以检测是否被阻止
    const tryPlay = async () => {
      try {
        await vLight.play()
        await vDark.play()
      } catch (e) {
        console.warn('[VideoBackground] 自动播放被阻止或未就绪', e)
        document.documentElement.setAttribute('data-video-status', 'blocked')
      }
    }

    tryPlay()

    return () => {
      vLight.removeEventListener('error', handleError)
      vDark.removeEventListener('error', handleError)
      vLight.removeEventListener('canplay', handleCanPlay)
      vDark.removeEventListener('canplay', handleCanPlay)
    }
  }, [])

  return (
    <>
      <video
        ref={lightRef}
        id="bg-video-light"
        className="bg-video"
        src="https://video.interknot.dpdns.org/light_bg.mp4"
        preload="auto"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
      <video
        ref={darkRef}
        id="bg-video-dark"
        className="bg-video"
        src="https://video.interknot.dpdns.org/dark_bg.mp4"
        preload="auto"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
    </>
  )
}
