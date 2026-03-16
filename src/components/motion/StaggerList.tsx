import { motion, useReducedMotion } from 'framer-motion';

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.06,
    },
  },
};

const staggerContainerReduced = {
  animate: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
};

const staggerItemReduced = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0 },
};

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
}

/** Wraps a list so children reveal with a quick stagger. */
export function StaggerList({ children, className }: StaggerListProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduceMotion ? staggerContainerReduced : staggerContainer}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduceMotion ? staggerItemReduced : staggerItem}
    >
      {children}
    </motion.div>
  );
}
