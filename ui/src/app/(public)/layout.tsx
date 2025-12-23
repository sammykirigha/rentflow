import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';
import { PropsWithChildren } from 'react';

export const dynamic = 'force-dynamic';

const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-white">
      <DotPattern
        className={cn(
          "mask-[radial-gradient(1000px_circle_at_center,white,transparent)]"
        )}
        glow={true}
      />


      {children}
    </div>
  );
};

export default Layout;
