import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { css, cx } from 'linaria';
import { styled } from 'linaria/react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { characterize } from '@narucode/characterizer';
import { tokenize } from '@narucode/tokenizer';

import { useMonaco, isPointOnSelection, isRangeOnSelection, Selection } from '../monaco';
import { getColor } from '../theme';
import LoadingIndicator from '../components/LoadingIndicator';

type Mode = 'characterize' | 'tokenize';
export default () => {
    const [code, setCode] = useState(initialCode);
    const onChangeHandler = useCallback((code: string) => setCode(code), []);
    const [mode, setMode] = useState<Mode>('characterize');
    const { MonacoEditor, props: monacoEditorProps, selection } = useMonaco();
    return <div className={css`
        display: flex;
        flex: 1;
    `}>
        <Column className={css`
            justify-content: center;
            align-items: center;
            font-size: 50px;
        `}>
            {MonacoEditor ? <MonacoEditor
                value={code}
                onChange={onChangeHandler}
                options={{
                    fontSize: 16,
                }}
                {...monacoEditorProps}
            /> : <LoadingIndicator/>}
        </Column>
        <Column className={css`
            border-left: 1px solid ${getColor('foreground')};
        `}>
            <div>
                <ModeButton mode='characterize' currentMode={mode} setMode={setMode}/>
                <ModeButton mode='tokenize' currentMode={mode} setMode={setMode}/>
            </div>
            <div className={css`flex: 1 0;`}>
                {
                    mode === 'characterize' ? <CharacterizerView code={code} selection={selection}/> :
                    mode === 'tokenize' ? <TokenizerView code={code} selection={selection}/> :
                    null
                }
            </div>
        </Column>
    </div>;
};

interface ModeButtonProps {
    mode: Mode;
    currentMode: Mode;
    setMode: (mode: Mode) => void;
}
const ModeButton: React.FC<ModeButtonProps> = memo(({ mode, currentMode, setMode }) => {
    const onClick = useCallback(() => setMode(mode), []);
    return <button onClick={onClick} className={cx(
        css`
            padding: 0 20px;
            height: 30px;
            font-size: 16px;
            border: none;
            outline: none;
            cursor: pointer;
        `,
        (mode === currentMode) ?
            css`
                color: ${getColor('foreground', 2)};
                background-color: ${getColor('background', 2)};
            ` :
            css`
                color: ${getColor('foreground', 1)};
                background-color: ${getColor('background', 1)};
            `,
    )}>{mode}</button>;
});

interface CharacterizerViewProps {
    code: string;
    selection: Selection | null;
}
const CharacterizerView: React.FC<CharacterizerViewProps> = ({ code, selection }) => {
    const characters = Array.from(characterize(code));
    const listRef = useRef(null as any as List);
    for (const pos of ['start', 'end'] as const) {
        useEffect(() => {
            if (!selection) return;
            if (!listRef.current) return;
            const list = listRef.current;
            list.scrollToItem(selection[pos].offset);
        }, [selection && selection[pos].offset]);
    }
    const CodeChar = useCallback(memo(({ index, style }: { index: number, style: React.CSSProperties }) => {
        const codeCharacter = characters[index];
        return <div style={style} className={cx(
            css`
                display: flex;
                align-items: center;
            `,
            selection && isPointOnSelection(index, selection) && css`
                color: ${getColor('foreground', 2)};
                background-color: ${getColor('background', 2)};
            `,
        )}>
            <div className={css`
                width: 50px;
                text-align: center;
            `}>{codeCharacter.char}</div>
            <div className={css`
                width: 100px;
            `}>U+{codeCharacter.codePoint.toString(16).toUpperCase().padStart(4, '0')}</div>
            <div className={css``}>{codeCharacter.type}</div>
        </div>;
    }), [characters]);
    return <AutoSizer>
        {({ width, height }) => <List
            ref={listRef}
            width={width}
            height={height}
            itemCount={characters.length}
            itemSize={30}>
            {CodeChar}
        </List>}
    </AutoSizer>;
};

interface TokenizerViewProps {
    code: string;
    selection: Selection | null;
}
const TokenizerView: React.FC<TokenizerViewProps> = ({ code, selection }) => {
    const tokens = Array.from(tokenize(characterize(code)));
    const listRef = useRef(null as any as List);
    for (const pos of ['start', 'end'] as const) {
        useEffect(() => {
            if (!selection) return;
            if (!listRef.current) return;
            const list = listRef.current;
            const offset = selection[pos].offset;
            const scrollIndex = tokens.findIndex(
                token => (offset < token.offset) || (offset < (token.offset + token.characters.length)),
            );
            ~scrollIndex && list.scrollToItem(scrollIndex);
        }, [selection && selection[pos].offset]);
    }
    const Token = useCallback(memo(({ index, style }: { index: number, style: React.CSSProperties }) => {
        const token = tokens[index];
        const isOnSelection = selection && isRangeOnSelection(
            token.offset,
            token.offset + token.characters.length,
            selection,
        );
        return <div style={style} className={cx(
            css`
                display: flex;
                align-items: center;
            `,
            isOnSelection && css`
                color: ${getColor('foreground', 2)};
                background-color: ${getColor('background', 2)};
            `,
        )}>
            <div className={css`
                padding: 0 20px;
                width: 150px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            `}>{token.characters.map(char => char.char).join('')}</div>
            <div className={css``}>{token.type}</div>
        </div>;
    }), [tokens]);
    return <AutoSizer>
        {({ width, height }) => <List
            ref={listRef}
            width={width}
            height={height}
            itemCount={tokens.length}
            itemSize={30}>
            {Token}
        </List>}
    </AutoSizer>;
};

const Column = styled.div`
    position: relative;
    flex: 1 0 0;
    display: flex;
    flex-direction: column;
    color: ${getColor('foreground')};
    background-color: ${getColor('background')};
`;

const initialCode = `
oldint := use naru core 0 (int)
hours := new type oldint
main := fn {
    delay := hours(4)
    #"#(delay)시간동안 기다리는 중" println()
}
`.trimLeft();