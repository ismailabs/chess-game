import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  circle = false,
  ...props
}) => {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-pulse bg-[var(--surface-container-high)] ${
        circle ? "rounded-full" : "rounded-xl"
      } ${className}`}
      {...props}
    />
  );
};
