import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { BadRequest } from '@tsed/exceptions';
import { DemoPage } from '@/features/demo/pages/demo.page';
import { demoConfig } from '@/features/demo/demo.config';

type Props = {
  /** Add HomeRoute props here */
};

export default function DemoRoute(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  return <DemoPage />;
}

export const getServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  const { locale } = context;
  if (locale === undefined) {
    throw new BadRequest('locale is missing');
  }
  const { i18nNamespaces } = demoConfig;
  return {
    props: {
      // i18nNamespaces.slice() is needed here to get rid off readonly
      ...(await serverSideTranslations(locale, i18nNamespaces.slice())),
    },
  };
};
