import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SkillFleet - India's First Industrial Exposure Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #7447E1 0%, #8B5CF6 35%, #9333EA 65%, #7C3AED 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Dot pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.06,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Gradient blobs */}
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -50,
            left: -50,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
            filter: "blur(60px)",
          }}
        />

        {/* Logo "!" icon */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 512 512"
          >
            <rect width="512" height="512" rx="112" fill="rgba(255,255,255,0.15)" />
            <rect x="210" y="80" width="92" height="248" rx="16" fill="#fff" />
            <circle cx="256" cy="408" r="56" fill="#fff" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-2px",
            marginBottom: 8,
          }}
        >
          sk!llfleet
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            fontWeight: 500,
            marginBottom: 32,
          }}
        >
          India&apos;s First Industrial Exposure Platform
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 60,
          }}
        >
          {[
            { value: "10,000+", label: "Students" },
            { value: "200+", label: "Schools" },
            { value: "50+", label: "Partners" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: "#FCD34D",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
