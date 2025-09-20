# JSON Fix Feature Demo

The JSON visualization platform now includes an automatic JSON fixer that can detect and fix common JSON encoding issues.

## How it works

When you paste invalid JSON, the system will:

1. **Detect** common issues like:
   - Wrapped quotes around entire JSON
   - Double-escaped JSON (from API responses/logs)
   - Single quotes instead of double quotes
   - Trailing commas
   - Unquoted object keys
   - JavaScript-style comments
   - Common typos (undefined→null, True→true, etc.)

2. **Show a "Fix JSON" button** when fixes are available

3. **Display what fixes will be applied** before you click the button

4. **Apply all fixes** with one click

## Test Cases

Try pasting these broken JSON examples to see the fixer in action:

### 1. Wrapped in quotes (common from API responses)

```
"{\"name\": \"John\", \"age\": 30, \"city\": \"New York\"}"
```

### 2. Single quotes (JavaScript object notation)

```
{'name': 'John', 'age': 30, 'city': 'New York'}
```

### 3. Trailing commas

```json
{
  "name": "John",
  "age": 30,
  "city": "New York"
}
```

### 4. Unquoted keys

```
{name: "John", age: 30, city: "New York"}
```

### 5. Double-escaped JSON (from logs)

```
"{\\\"name\\\": \\\"John\\\", \\\"age\\\": 30}"
```

### 6. JavaScript comments

```json
{
  // User information
  "name": "John",
  "age": 30 /* years old */,
  "city": "New York"
}
```

### 7. Common typos

```json
{
  "name": "John",
  "active": True,
  "data": undefined,
  "value": None
}
```

## UI Features

- **Green "Fix JSON" button** appears when fixes are available
- **Fix preview** shows exactly what changes will be made
- **One-click application** of all fixes
- **Automatic validation** after fixes are applied

The fixer is smart enough to only suggest fixes when it's confident they will result in valid JSON, so you won't see the fix button for JSON that's too broken to repair automatically.
