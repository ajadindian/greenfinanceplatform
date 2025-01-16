# Data Processing Best Practices

## General Guidelines
- Always validate input data before processing
- Maintain data type consistency across chunks
- Log all data transformations for audit trails
- Handle missing values appropriately based on context

## Excel Processing
- Check for hidden sheets and rows
- Validate formula results
- Preserve cell formatting information when relevant
- Handle merged cells appropriately

## Relationships
- Look for common patterns in column names
- Validate foreign key relationships
- Document any identified relationships
- Handle circular references

## Error Handling
- Log all errors with context
- Provide meaningful error messages
- Implement retry mechanisms for transient failures
- Maintain data integrity during failures 