declare module 'react-diff-viewer-continued' {
    import * as React from 'react';

    export enum DiffMethod {
        CHARS = 'diffChars',
        WORDS = 'diffWords',
        LINES = 'diffLines',
        TRIMMED_LINES = 'diffTrimmedLines',
        SENTENCES = 'diffSentences',
        CSS = 'diffCss',
        JSON = 'diffJson',
    }

    export interface ReactDiffViewerProps {
        oldValue?: string;
        newValue?: string;
        splitView?: boolean;
        disableWordDiff?: boolean;
        compareMethod?: DiffMethod;
        hideLineNumbers?: boolean;
        renderContent?: (source: string) => JSX.Element;
        onLineNumberClick?: (lineId: string, event: React.MouseEvent<HTMLSpanElement>) => void;
        styles?: Record<string, string | number | object>;
        useDarkTheme?: boolean;
        leftTitle?: string;
        rightTitle?: string;
    }

    const ReactDiffViewer: React.FC<ReactDiffViewerProps>;
    export default ReactDiffViewer;
}
