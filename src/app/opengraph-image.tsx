import { ImageResponse } from "next/og";
import { LOGO_SVG } from "@/lib/brand/logo-svg";

export const alt = "SkillFleet - India's First Industrial Exposure Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // The logo SVG with its original colours (black + purple on a white bg).
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#ffffff",
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
              "radial-gradient(circle at 1px 1px, #7447E1 1px, transparent 0)",
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
            background: "rgba(116,71,224,0.05)",
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
            background: "rgba(116,71,224,0.04)",
            filter: "blur(60px)",
          }}
        />

        {/* Actual SkillFleet logo (white) */}
        <img
          src={logoSrc}
          width={420}
          height={115}
          style={{ marginBottom: 24 }}
        />

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "rgba(0,0,0,0.5)",
            fontWeight: 500,
            marginBottom: 40,
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
                  color: "#7447E1",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "rgba(0,0,0,0.4)",
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
