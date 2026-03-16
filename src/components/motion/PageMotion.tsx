import { motion, useReducedMotion } from 'framer-motion';

const pageTransition = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
};

const pageTransitionReduced = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0 },
};

interface PageMotionProps {
  children: React.ReactNode;
  className?: string;
}

/** Wraps page content with a visible but tasteful enter animation (fade + slide up). */
export function PageMotion({ children, className }: PageMotionProps) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? pageTransitionReduced : pageTransition;
  return (
    <motion.div
      initial={transition.initial}
      animate={transition.animate}
      transition={transition.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const pageVariants = pageTransition;
