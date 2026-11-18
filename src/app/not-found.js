"use client";

import { useEffect } from "react";

export default function NotFound() {
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyBg = document.body.style.background;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.background = "#000";
    document.title = "404 — Page not found";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.background = prevBodyBg;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#fff",
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 500,
            margin: 0,
            paddingRight: "23px",
            borderRight: "1px solid rgba(255,255,255,0.3)",
            lineHeight: "49px",
          }}
        >
          404
        </h1>
        <div
          style={{
            display: "inline-block",
            marginLeft: "20px",
            fontSize: "0.875rem",
            lineHeight: "49px",
          }}
        >
          <h2 style={{ fontSize: "inherit", fontWeight: 400, margin: 0 }}>
            This page could not be found.
          </h2>
        </div>
      </div>
    </div>
  );
}
