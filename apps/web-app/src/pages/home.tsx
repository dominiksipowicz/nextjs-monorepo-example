import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { HomePage } from '@/features/home/pages/home.page';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { BadRequest } from '@tsed/exceptions';
import { homeConfig } from '@/features/home/home.config';

type Props = {
  /** Add HomeRoute props here */
};

export default function HomeRoute(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  return <HomePage />;
}

export const getServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  const { locale } = context;
  if (locale === undefined) {
    throw new BadRequest('locale is missing');
  }
  const { i18nNamespaces } = homeConfig;
  return {
    props: {
      // i18nNamespaces.slice() is needed here to get rid off readonly
      ...(await serverSideTranslations(locale, i18nNamespaces.slice())),
    },
  };
};
