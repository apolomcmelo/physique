import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="pt-BR">
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1, viewport-fit=cover"
                />
                <meta name="theme-color" content="#0A0A0F" />
                <style dangerouslySetInnerHTML={{
                    __html: `
                    html, body, #root {
                        width: 100%;
                        min-height: 100%;
                        overflow-x: hidden;
                        background-color: #0A0A0F;
                    }

                    body {
                        margin: 0;
                    }

                    * {
                        box-sizing: border-box;
                    }
                ` }} />
                <ScrollViewStyleReset />
            </head>
            <body>{children}</body>
        </html>
    );
}
