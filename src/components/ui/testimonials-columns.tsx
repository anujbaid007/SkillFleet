import React from "react";
import { Star } from "lucide-react";

interface Testimonial {
  text: string;
  name: string;
  role: string;
  rating?: number;
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <div
        className="flex flex-col gap-6 pb-6 animate-marquee-vertical"
        style={{ animationDuration: `${props.duration || 10}s` }}
      >
        {[...Array(2)].map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, name, role, rating = 5 }, i) => (
              <div
                className="clay-card p-6 max-w-xs w-full"
                key={i}
              >
                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: rating }).map((_, s) => (
                    <Star
                      key={s}
                      className="w-4 h-4 text-accent-yellow fill-accent-yellow"
                    />
                  ))}
                </div>

                {/* Quote */}
                <div className="text-sm leading-relaxed text-foreground/80">
                  &ldquo;{text}&rdquo;
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-white font-display font-bold text-sm shrink-0">
                    {name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <div className="font-display font-semibold text-sm tracking-tight leading-5 text-foreground">
                      {name}
                    </div>
                    <div className="leading-5 text-muted text-xs tracking-tight">
                      {role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
