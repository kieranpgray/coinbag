import type { HeroIndex } from './heroHeadlineModel';

export function HeroHeadline({ index }: { index: HeroIndex }) {
  switch (index) {
    case 0:
      return (
        <>
          You&apos;re not trying to spend less.<br />
          You&apos;re trying to <em>build more.</em>
        </>
      );
    case 1:
      return <>Your financial life has outgrown a spreadsheet.</>;
    case 2:
      return (
        <>
          Most finance tools tell you what happened.<br />
          Supafolio tells you <em>what to do next.</em>
        </>
      );
  }
}
