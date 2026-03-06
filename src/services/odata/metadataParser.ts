/**
 * OData Metadata (EDMX) Parser
 *
 * Parses OData $metadata XML (EDMX format) into structured TypeScript objects.
 *
 * ★ Insight ─────────────────────────────────────
 * - EDMX is the XML format for OData service metadata
 * - Supports both OData V2 and V4 metadata structures
 * - EntityTypes define the structure of data entities
 * - EntitySets are collections accessible via the service
 * - FunctionImports are callable operations (like stored procedures)
 * ─────────────────────────────────────────────────
 */

import type {
    Association,
    AssociationEnd,
    ComplexType,
    EntitySet,
    EntityType,
    FunctionImport,
    FunctionParameter,
    HttpMethod,
    NavigationProperty,
    ODataMetadata,
    ODataProperty,
    ODataSchema
} from '../../types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get attribute value from element (null-safe)
 */
function getAttribute(element: Element, name: string): string | null {
    return element.getAttribute(name);
}

/**
 * Get attribute value with default
 */
function getAttributeWithDefault(element: Element, name: string, defaultValue: string): string {
    return element.getAttribute(name) ?? defaultValue;
}

/**
 * Check if attribute equals 'false' (default is true)
 */
function isNullable(element: Element): boolean {
    return getAttribute(element, 'Nullable') !== 'false';
}

// ============================================================================
// Property Parsing
// ============================================================================

/**
 * Parse a Property element
 *
 * Extracts both standard OData attributes and SAP-specific annotations.
 * SAP annotations default to true if not explicitly set to 'false'.
 */
function parseProperty(element: Element, keys: string[]): ODataProperty {
    const name = getAttribute(element, 'Name') ?? '';
    return {
        name,
        type: getAttribute(element, 'Type') ?? 'Edm.String',
        nullable: isNullable(element),
        maxLength: getAttribute(element, 'MaxLength'),
        precision: getAttribute(element, 'Precision'),
        scale: getAttribute(element, 'Scale'),
        isKey: keys.includes(name),
        defaultValue: getAttribute(element, 'DefaultValue'),
        // SAP-specific annotations (default to true if not specified as 'false')
        sapLabel: getAttribute(element, 'sap:label') ?? undefined,
        sapFilterable: getAttribute(element, 'sap:filterable') !== 'false',
        sapSortable: getAttribute(element, 'sap:sortable') !== 'false',
        sapCreatable: getAttribute(element, 'sap:creatable') !== 'false',
        sapUpdatable: getAttribute(element, 'sap:updatable') !== 'false'
    };
}

/**
 * Parse a NavigationProperty element
 */
function parseNavigationProperty(element: Element): NavigationProperty {
    return {
        name: getAttribute(element, 'Name') ?? '',
        // OData V2
        relationship: getAttribute(element, 'Relationship') ?? undefined,
        fromRole: getAttribute(element, 'FromRole') ?? undefined,
        toRole: getAttribute(element, 'ToRole') ?? undefined,
        // OData V4
        type: getAttribute(element, 'Type') ?? undefined,
        partner: getAttribute(element, 'Partner') ?? undefined
    };
}

// ============================================================================
// Type Parsing
// ============================================================================

/**
 * Parse an EntityType element
 */
function parseEntityType(element: Element, namespace: string): EntityType {
    const name = getAttribute(element, 'Name') ?? '';

    // Get Key properties
    const keys: string[] = [];
    const keyRefs = element.querySelectorAll('Key > PropertyRef');
    keyRefs.forEach((keyRef) => {
        const keyName = getAttribute(keyRef, 'Name');
        if (keyName) keys.push(keyName);
    });

    // Get Properties (direct children only)
    const properties: ODataProperty[] = [];
    const propElements = element.querySelectorAll(':scope > Property');
    propElements.forEach((prop) => {
        properties.push(parseProperty(prop, keys));
    });

    // Get Navigation Properties
    const navigationProperties: NavigationProperty[] = [];
    const navPropElements = element.querySelectorAll('NavigationProperty');
    navPropElements.forEach((navProp) => {
        navigationProperties.push(parseNavigationProperty(navProp));
    });

    return {
        name,
        namespace,
        fullName: `${namespace}.${name}`,
        keys,
        properties,
        navigationProperties,
        baseType: getAttribute(element, 'BaseType') ?? undefined
    };
}

/**
 * Parse a ComplexType element
 */
function parseComplexType(element: Element, namespace: string): ComplexType {
    const name = getAttribute(element, 'Name') ?? '';

    const properties: ODataProperty[] = [];
    const propElements = element.querySelectorAll('Property');
    propElements.forEach((prop) => {
        properties.push(parseProperty(prop, []));
    });

    return {
        name,
        namespace,
        fullName: `${namespace}.${name}`,
        properties
    };
}

// ============================================================================
// Association Parsing (OData V2)
// ============================================================================

/**
 * Parse an Association element
 */
function parseAssociation(element: Element, namespace: string): Association {
    const name = getAttribute(element, 'Name') ?? '';

    const ends: AssociationEnd[] = [];
    const endElements = element.querySelectorAll('End');
    endElements.forEach((end) => {
        ends.push({
            type: getAttribute(end, 'Type') ?? '',
            multiplicity: getAttribute(end, 'Multiplicity') ?? '',
            role: getAttribute(end, 'Role') ?? ''
        });
    });

    return {
        name,
        namespace,
        ends
    };
}

// ============================================================================
// EntitySet Parsing
// ============================================================================

/**
 * Parse an EntitySet element
 */
function parseEntitySet(element: Element): EntitySet {
    return {
        name: getAttribute(element, 'Name') ?? '',
        entityType: getAttribute(element, 'EntityType') ?? '',
        navigationBindings: [] // V4 only, parsed separately if needed
    };
}

// ============================================================================
// FunctionImport Parsing
// ============================================================================

/**
 * Parse a FunctionImport element
 */
function parseFunctionImport(element: Element): FunctionImport {
    const name = getAttribute(element, 'Name') ?? '';

    // Get HTTP method (m:HttpMethod for SAP, HttpMethod for standard)
    let httpMethod: HttpMethod = 'GET';
    const methodAttr = getAttribute(element, 'm:HttpMethod') || getAttribute(element, 'HttpMethod');
    if (methodAttr) {
        httpMethod = methodAttr.toUpperCase() as HttpMethod;
    }

    // Parse parameters
    const parameters: FunctionParameter[] = [];
    const paramElements = element.querySelectorAll('Parameter');
    paramElements.forEach((param) => {
        parameters.push({
            name: getAttribute(param, 'Name') ?? '',
            type: getAttribute(param, 'Type') ?? 'Edm.String',
            mode: getAttributeWithDefault(param, 'Mode', 'In') as FunctionParameter['mode'],
            nullable: isNullable(param)
        });
    });

    return {
        name,
        returnType: getAttribute(element, 'ReturnType') ?? undefined,
        entitySet: getAttribute(element, 'EntitySet') ?? undefined,
        httpMethod,
        parameters
    };
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse OData EDMX metadata XML
 */
export function parseMetadataXml(xmlString: string): ODataMetadata | null {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');

        // Check for parse errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            console.error('[MetadataParser] XML parse error:', parseError.textContent);
            return null;
        }

        const metadata: ODataMetadata = {
            schemas: [],
            entityTypes: [],
            entitySets: [],
            complexTypes: [],
            associations: [],
            functionImports: [],
            serviceUrl: '',
            rawXml: xmlString
        };

        // Find all Schema elements (handles different namespaces)
        const schemas = doc.querySelectorAll('Schema');

        schemas.forEach((schema) => {
            const namespace = getAttribute(schema, 'Namespace') ?? '';
            const alias = getAttribute(schema, 'Alias');

            // Add schema info
            const schemaInfo: ODataSchema = { namespace };
            if (alias) schemaInfo.alias = alias;
            metadata.schemas.push(schemaInfo);

            // Parse EntityTypes
            const entityTypes = schema.querySelectorAll('EntityType');
            entityTypes.forEach((et) => {
                metadata.entityTypes.push(parseEntityType(et, namespace));
            });

            // Parse ComplexTypes
            const complexTypes = schema.querySelectorAll('ComplexType');
            complexTypes.forEach((ct) => {
                metadata.complexTypes.push(parseComplexType(ct, namespace));
            });

            // Parse Associations (OData V2)
            const associations = schema.querySelectorAll('Association');
            associations.forEach((assoc) => {
                metadata.associations.push(parseAssociation(assoc, namespace));
            });

            // Parse EntityContainer contents
            const containers = schema.querySelectorAll('EntityContainer');
            containers.forEach((container) => {
                // EntitySets
                const entitySets = container.querySelectorAll('EntitySet');
                entitySets.forEach((es) => {
                    metadata.entitySets.push(parseEntitySet(es));
                });

                // FunctionImports
                const functionImports = container.querySelectorAll('FunctionImport');
                functionImports.forEach((fi) => {
                    metadata.functionImports.push(parseFunctionImport(fi));
                });
            });
        });

        return metadata;
    } catch (error) {
        console.error('[MetadataParser] Error parsing metadata XML:', error);
        return null;
    }
}

/**
 * Find EntityType by name (searches by short name or full name)
 */
export function findEntityType(metadata: ODataMetadata, name: string): EntityType | undefined {
    return metadata.entityTypes.find((et) => et.name === name || et.fullName === name);
}

/**
 * Find EntitySet by name
 */
export function findEntitySet(metadata: ODataMetadata, name: string): EntitySet | undefined {
    return metadata.entitySets.find((es) => es.name === name);
}

/**
 * Get EntityType for an EntitySet
 */
export function getEntityTypeForSet(metadata: ODataMetadata, entitySetName: string): EntityType | undefined {
    const entitySet = findEntitySet(metadata, entitySetName);
    if (!entitySet) return undefined;

    // EntitySet.entityType is a fully qualified name like "Namespace.TypeName"
    return findEntityType(metadata, entitySet.entityType);
}

/**
 * Find FunctionImport by name
 */
export function findFunctionImport(metadata: ODataMetadata, name: string): FunctionImport | undefined {
    return metadata.functionImports.find((fi) => fi.name === name);
}

/**
 * Find ComplexType by name
 */
export function findComplexType(metadata: ODataMetadata, name: string): ComplexType | undefined {
    return metadata.complexTypes.find((ct) => ct.name === name || ct.fullName === name);
}

/**
 * Extract service URL from metadata URL
 */
export function extractServiceUrl(metadataUrl: string): string {
    return metadataUrl.replace(/\/?\$metadata.*$/i, '');
}
