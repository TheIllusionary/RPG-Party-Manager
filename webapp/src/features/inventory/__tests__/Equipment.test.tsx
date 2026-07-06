import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Equipment from '../Equipment';
import * as useCompendiumItemsModule from '../../../shared/hooks/useCompendiumItems';

// Mock the compendium items hook
vi.mock('../../../shared/hooks/useCompendiumItems', () => {
    return {
        useCompendiumItems: vi.fn()
    };
});

// Create a stateful wrapper to simulate the GameApp passing state
function EquipmentTestWrapper({ mockUpdateCustomItems }: { mockUpdateCustomItems: any }) {
    const [data, setData] = useState({ inventories: {} });
    const mockPlayers = [{ id: 'p1', name: 'Hero' }];

    const handleUpdateData = (newData: any) => {
        setData(newData);
    };

    return (
        <Equipment 
            data={data}
            updateData={handleUpdateData}
            players={mockPlayers}
            buffsDatabase={[]}
            updateBuffsDatabase={vi.fn()}
            customItems={[]}
            updateCustomItems={mockUpdateCustomItems}
        />
    );
}

describe('Equipment Component', () => {
    const mockUpdateCustomItems = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default compendium mock
        (useCompendiumItemsModule.useCompendiumItems as any).mockReturnValue({
            items: [
                { name: 'Longsword', type: 'weapon', quantity: 1, weight: '3 lb.' },
                { name: 'Healing Potion', type: 'Consumables', quantity: 1, weight: '0.5 lb.' }
            ],
            loading: false,
            error: null,
            reload: vi.fn()
        });
    });

    it('renders empty inventory state', () => {
        render(<EquipmentTestWrapper mockUpdateCustomItems={mockUpdateCustomItems} />);
        expect(screen.getByText('Hero')).toBeInTheDocument();
        expect(screen.getByText('No items yet.')).toBeInTheDocument();
    });

    it('combobox search filters items', async () => {
        const user = userEvent.setup();
        render(<EquipmentTestWrapper mockUpdateCustomItems={mockUpdateCustomItems} />);

        // Click Add Item
        const addButton = screen.getByText('Add Item');
        await user.click(addButton);

        // Find combobox input
        const input = await screen.findByPlaceholderText('Item Name');
        
        // Clear default "New Item" text and type
        await user.clear(input);
        await user.type(input, 'Long');

        // Check dropdown options
        await waitFor(() => {
            expect(screen.getByText('Longsword')).toBeInTheDocument();
        });
        expect(screen.queryByText('Healing Potion')).not.toBeInTheDocument();
    });

    it('selecting an item from combobox fills data', async () => {
        const user = userEvent.setup();
        render(<EquipmentTestWrapper mockUpdateCustomItems={mockUpdateCustomItems} />);

        const addButton = screen.getByText('Add Item');
        await user.click(addButton);
        const input = await screen.findByPlaceholderText('Item Name');
        
        // Clear to see all options
        await user.clear(input);
        await user.click(input);
        
        // Select Healing Potion
        const option = await screen.findByText('Healing Potion');
        await user.click(option);

        // Verify the input has the value
        expect(input).toHaveValue('Healing Potion');
    });

    it('creates a custom item and syncs it when unrecognized name is used', async () => {
        const user = userEvent.setup();
        render(<EquipmentTestWrapper mockUpdateCustomItems={mockUpdateCustomItems} />);

        const addButton = screen.getByText('Add Item');
        await user.click(addButton);
        
        const input = await screen.findByPlaceholderText('Item Name');
        await user.clear(input);
        await user.type(input, 'Homebrew Dagger');
        
        // Click Save
        const saveButton = screen.getByText('Save');
        await user.click(saveButton);

        // Expect updateCustomItems to be called because Homebrew Dagger is not in the compendium
        expect(mockUpdateCustomItems).toHaveBeenCalled();
        const customItemsArg = mockUpdateCustomItems.mock.calls[0][0];
        expect(customItemsArg[0].name).toBe('Homebrew Dagger');
    });

    it('does not create custom item if recognized name is used', async () => {
        const user = userEvent.setup();
        render(<EquipmentTestWrapper mockUpdateCustomItems={mockUpdateCustomItems} />);

        const addButton = screen.getByText('Add Item');
        await user.click(addButton);
        
        const input = await screen.findByPlaceholderText('Item Name');
        await user.clear(input);
        await user.type(input, 'Longsword'); // Match EXACTLY

        // Click Save
        const saveButton = screen.getByText('Save');
        await user.click(saveButton);
        
        // Custom items should NOT be updated
        expect(mockUpdateCustomItems).not.toHaveBeenCalled();
    });
});
