import React, { ReactNode } from 'react';
import './Accordion.css';

export function AccordionContainer({ children }: { children: ReactNode }) {
    return <div className="traits-accordion-container">{children}</div>;
}

export function AccordionGroup({ title, children }: { title: ReactNode, children: ReactNode }) {
    return (
        <div className="traits-category-group">
            <h3 className="traits-category-header">{title}</h3>
            <div className="traits-list">{children}</div>
        </div>
    );
}

export function AccordionItem({ summary, children }: { summary: ReactNode, children: ReactNode }) {
    return (
        <details className="trait-details">
            <summary className="trait-summary">{summary}</summary>
            <div className="trait-content">{children}</div>
        </details>
    );
}
