/**
 * Component Isolation Test Page
 * 
 * This file provides isolated test pages for Select and Input components
 * to verify styling changes don't break functionality before applying to forms.
 * 
 * Usage: Import and render these components in a test page to visually verify
 * all states and behaviors.
 */

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { Input } from '../input';
import { Label } from '../label';

/**
 * Select Component Isolation Test
 * Tests all states: default, hover, focus, disabled, error
 */
export function SelectIsolationTest() {
  const [value, setValue] = useState<string>('');

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold">Select Component Isolation Test</h2>
      
      {/* Default State */}
      <div className="space-y-2">
        <Label>Default State</Label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
            <SelectItem value="option3">Option 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Disabled State */}
      <div className="space-y-2">
        <Label>Disabled State</Label>
        <Select value={value} onValueChange={setValue} disabled>
          <SelectTrigger>
            <SelectValue placeholder="Disabled select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* With Selected Value */}
      <div className="space-y-2">
        <Label>With Selected Value</Label>
        <Select value="option2" onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
            <SelectItem value="option3">Option 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Input Component Isolation Test
 * Tests all states: default, hover, focus, disabled, error, with/without clearOnFocus
 */
export function InputIsolationTest() {
  const [textValue, setTextValue] = useState('');
  const [numberValue, setNumberValue] = useState<number>(0);
  const [clearedValue, setClearedValue] = useState<number>(0);

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold">Input Component Isolation Test</h2>
      
      {/* Default Text Input */}
      <div className="space-y-2">
        <Label>Default Text Input</Label>
        <Input
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Enter text"
        />
      </div>

      {/* Number Input */}
      <div className="space-y-2">
        <Label>Number Input</Label>
        <Input
          type="number"
          value={numberValue}
          onChange={(e) => setNumberValue(Number(e.target.value))}
          placeholder="0.00"
        />
      </div>

      {/* Input with Clear-on-Focus */}
      <div className="space-y-2">
        <Label>Input with Clear-on-Focus (value: {clearedValue})</Label>
        <Input
          type="number"
          value={clearedValue}
          onChange={(e) => setClearedValue(Number(e.target.value) || 0)}
          clearOnFocus
          clearValue={0}
          placeholder="0.00"
        />
        <p className="text-sm text-muted-foreground">
          Click into this field when value is 0 to test clear-on-focus behavior
        </p>
      </div>

      {/* Disabled Input */}
      <div className="space-y-2">
        <Label>Disabled Input</Label>
        <Input
          type="text"
          value="Disabled value"
          disabled
          placeholder="Disabled"
        />
      </div>

      {/* Error State (simulated with className) */}
      <div className="space-y-2">
        <Label>Error State</Label>
        <Input
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          className="border-destructive"
          placeholder="Error state"
        />
        <p className="text-sm text-destructive">Error message</p>
      </div>
    </div>
  );
}


