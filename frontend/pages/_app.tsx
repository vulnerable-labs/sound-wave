import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../src/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>SoundWave - AI Audio Mastering & Normalization</title>
        <meta name="description" content="SoundWave is a specialized audio platform where independent musicians and podcasters upload raw audio for automatic AI normalization." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
