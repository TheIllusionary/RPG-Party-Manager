const fs = require('fs');
const file = 'src/features/battle/components/PlayerCard.tsx';
let content = fs.readFileSync(file, 'utf-8');
const lines = content.split(/\r?\n/);

const buffBlockLines = lines.slice(297, 463);
let innerBlock = buffBlockLines.join('\n');

innerBlock = innerBlock.replace(/className=\"player-buff-badge/g, 'className=\"player-buff-badge actor-mod-badge actor-mod-badge--buff');
innerBlock = innerBlock.replace(/let badgeClass = \"player-buff-badge\";/g, 'let badgeClass = \"player-buff-badge actor-mod-badge actor-mod-badge--buff\";');
innerBlock = innerBlock.replace(/title=\{\(\(\) => \{/g, 'data-tooltip={((\) => {');

const blockToRemove = lines.slice(294, 464).join('\n') + '\n';
content = content.replace(blockToRemove, '');
content = content.replace(blockToRemove.replace(/\n/g, '\r\n'), '');

const targetStr1 = '<ActorModifierBadges\n                                                        entityType=\"player\"\n                                                        entityId={player.id}\n                                                        conditions={player.cc ?? []}\n                                                        modifiers={getModifiersFor(player.id)}\n                                                        onAddCondition={(_type, id, effect) => addCc(id, effect)}\n                                                        onRemoveCondition={(_type, id, effect) => removeCc(id, effect)}\n                                                    />';
const targetStr2 = targetStr1.replace(/\n/g, '\r\n');

const replacementStr = '<ActorModifierBadges\n                                                        entityType=\"player\"\n                                                        entityId={player.id}\n                                                        conditions={player.cc ?? []}\n                                                        modifiers={getModifiersFor(player.id)}\n                                                        onAddCondition={(_type, id, effect) => addCc(id, effect)}\n                                                        onRemoveCondition={(_type, id, effect) => removeCc(id, effect)}\n                                                    >\n' + innerBlock + '\n                                                    </ActorModifierBadges>';

if (content.includes(targetStr1)) {
    content = content.replace(targetStr1, replacementStr);
    fs.writeFileSync(file, content);
    console.log('Successfully moved Buff logic in PlayerCard.tsx (LF)');
} else if (content.includes(targetStr2)) {
    content = content.replace(targetStr2, replacementStr.replace(/\n/g, '\r\n'));
    fs.writeFileSync(file, content);
    console.log('Successfully moved Buff logic in PlayerCard.tsx (CRLF)');
} else {
    console.log('Failed to find ActorModifierBadges target string.');
}
