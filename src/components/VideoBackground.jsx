import React from 'react'

export default function VideoBackground() {
  return (
    <>
      <video
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
