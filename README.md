# POEM MCP Server

MCP server for [POEM](https://openpoem.org) (Pseudo-code Oriented Executable Markup).

Write specs once, get code in any language.

## Tools

| Tool | What it does |
|------|-------------|
| `poem_read` | Parse a .poem file into structured elements |
| `poem_validate` | Check syntax and naming conventions |
| `poem_translate` | Prepare a spec for translation to any language |

## Install

Clone and build:

```bash
git clone https://github.com/openpoem/poem-mcp.git
cd poem-mcp
npm install && npm run build
```

## Configure

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "poem": {
      "command": "node",
      "args": ["/path/to/poem-mcp/dist/mcp.js"]
    }
  }
}
```

## Usage

### Read a POEM

> "Read this poem file and explain what it does"

The `poem_read` tool parses `.poem` files into structured elements (constants, structs, functions, enums, etc).

### Validate a POEM

> "Validate this poem spec"

Checks for syntax errors, naming convention compliance, and structural completeness.

### Translate a POEM

> "Translate this poem to Python"

The tool parses and validates the spec, then provides a structured translation brief with language-specific type mappings. The LLM then generates idiomatic code.

Supported targets: Python, TypeScript, Go, Rust, Java, Swift, Kotlin, SQL, and any other language.

## Example

```poem
// pricing.poem
const TAX_RATE = 0.21;

struct Product {
  name: string;
  price: float;
}

fn total(p: Product, qty: int) -> float {
  return p.price * qty * (1 + TAX_RATE);
}
```

Ask: "Translate to Go" and get:

```go
const TAX_RATE = 0.21

type Product struct {
    Name  string
    Price float64
}

func Total(p Product, qty int64) float64 {
    return p.Price * float64(qty) * (1 + TAX_RATE)
}
```

## Origin

Built by [OpenPoem](https://openpoem.org)

## License

MIT
