/**
 * Metadata Parser Tests
 */

import { describe, it, expect } from 'vitest';
import {
    parseMetadataXml,
    findEntityType,
    findEntitySet,
    getEntityTypeForSet,
    findFunctionImport,
    findComplexType,
    extractServiceUrl
} from '../../../src/services/odata/metadataParser';

describe('Metadata Parser', () => {
    const sampleMetadataXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">
  <edmx:DataServices m:DataServiceVersion="2.0" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
    <Schema Namespace="TestNamespace" xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
      <EntityType Name="Product">
        <Key>
          <PropertyRef Name="ProductID"/>
        </Key>
        <Property Name="ProductID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Name" Type="Edm.String" MaxLength="100"/>
        <Property Name="Price" Type="Edm.Decimal" Precision="19" Scale="4"/>
        <Property Name="CreatedAt" Type="Edm.DateTime"/>
        <NavigationProperty Name="Category" Relationship="TestNamespace.ProductCategory" FromRole="Product" ToRole="Category"/>
      </EntityType>
      <EntityType Name="Category">
        <Key>
          <PropertyRef Name="CategoryID"/>
        </Key>
        <Property Name="CategoryID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Name" Type="Edm.String"/>
        <NavigationProperty Name="Products" Relationship="TestNamespace.ProductCategory" FromRole="Category" ToRole="Product"/>
      </EntityType>
      <ComplexType Name="Address">
        <Property Name="Street" Type="Edm.String"/>
        <Property Name="City" Type="Edm.String"/>
        <Property Name="PostalCode" Type="Edm.String"/>
      </ComplexType>
      <Association Name="ProductCategory">
        <End Type="TestNamespace.Product" Multiplicity="*" Role="Product"/>
        <End Type="TestNamespace.Category" Multiplicity="1" Role="Category"/>
      </Association>
      <EntityContainer Name="TestContainer" m:IsDefaultEntityContainer="true">
        <EntitySet Name="Products" EntityType="TestNamespace.Product"/>
        <EntitySet Name="Categories" EntityType="TestNamespace.Category"/>
        <FunctionImport Name="GetTopProducts" ReturnType="Collection(TestNamespace.Product)" m:HttpMethod="GET">
          <Parameter Name="count" Type="Edm.Int32" Mode="In"/>
        </FunctionImport>
        <FunctionImport Name="CreateOrder" m:HttpMethod="POST">
          <Parameter Name="productId" Type="Edm.Int32" Mode="In"/>
          <Parameter Name="quantity" Type="Edm.Int32" Mode="In"/>
        </FunctionImport>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    describe('parseMetadataXml', () => {
        it('should parse valid EDMX XML', () => {
            const result = parseMetadataXml(sampleMetadataXml);
            expect(result).not.toBeNull();
            expect(result?.schemas).toHaveLength(1);
            expect(result?.schemas[0].namespace).toBe('TestNamespace');
        });

        it('should parse entity types correctly', () => {
            const result = parseMetadataXml(sampleMetadataXml);
            expect(result?.entityTypes).toHaveLength(2);

            const product = result?.entityTypes.find((et) => et.name === 'Product');
            expect(product).toBeDefined();
            expect(product?.namespace).toBe('TestNamespace');
            expect(product?.fullName).toBe('TestNamespace.Product');
            expect(product?.keys).toEqual(['ProductID']);
            expect(product?.properties).toHaveLength(4);
        });

        it('should parse entity type properties correctly', () => {
            const result = parseMetadataXml(sampleMetadataXml);
            const product = result?.entityTypes.find((et) => et.name === 'Product');

            const idProp = product?.properties.find((p) => p.name === 'ProductID');
            expect(idProp?.type).toBe('Edm.Int32');
            expect(idProp?.nullable).toBe(false);
            expect(idProp?.isKey).toBe(true);

            const nameProp = product?.properties.find((p) => p.name === 'Name');
            expect(nameProp?.type).toBe('Edm.String');
            expect(nameProp?.maxLength).toBe('100');
            expect(nameProp?.nullable).toBe(true);

            const priceProp = product?.properties.find((p) => p.name === 'Price');
            expect(priceProp?.precision).toBe('19');
            expect(priceProp?.scale).toBe('4');
        });

        it('should parse navigation properties', () => {
            const result = parseMetadataXml(sampleMetadataXml);
            const product = result?.entityTypes.find((et) => et.name === 'Product');

            expect(product?.navigationProperties).toHaveLength(1);
            const navProp = product?.navigationProperties[0];
            expect(navProp?.name).toBe('Category');
            expect(navProp?.relationship).toBe('TestNamespace.ProductCategory');
            expect(navProp?.fromRole).toBe('Product');
            expect(navProp?.toRole).toBe('Category');
        });

        it('should parse complex types', () => {
            const result = parseMetadataXml(sampleMetadataXml);
            expect(result?.complexTypes).toHaveLength(1);

            const address = result?.complexTypes[0];
            expect(address?.name).toBe('Address');
            expect(address?.fullName).toBe('TestNamespace.Address');
            expect(address?.properties).toHaveLength(3);
        });

        it('should parse associations', () => {
            const result = parseMetadataXml(sampleMetadataXml);
            expect(result?.associations).toHaveLength(1);

            const assoc = result?.associations[0];
            expect(assoc?.name).toBe('ProductCategory');
            expect(assoc?.ends).toHaveLength(2);
            expect(assoc?.ends[0].multiplicity).toBe('*');
            expect(assoc?.ends[1].multiplicity).toBe('1');
        });

        it('should parse entity sets', () => {
            const result = parseMetadataXml(sampleMetadataXml);
            expect(result?.entitySets).toHaveLength(2);

            const productsSet = result?.entitySets.find((es) => es.name === 'Products');
            expect(productsSet?.entityType).toBe('TestNamespace.Product');
        });

        it('should parse function imports', () => {
            const result = parseMetadataXml(sampleMetadataXml);
            expect(result?.functionImports).toHaveLength(2);

            const getTop = result?.functionImports.find((fi) => fi.name === 'GetTopProducts');
            expect(getTop?.returnType).toBe('Collection(TestNamespace.Product)');
            expect(getTop?.httpMethod).toBe('GET');
            expect(getTop?.parameters).toHaveLength(1);
            expect(getTop?.parameters[0].name).toBe('count');
            expect(getTop?.parameters[0].type).toBe('Edm.Int32');

            const createOrder = result?.functionImports.find((fi) => fi.name === 'CreateOrder');
            expect(createOrder?.httpMethod).toBe('POST');
            expect(createOrder?.parameters).toHaveLength(2);
        });

        it('should return null for invalid XML', () => {
            const result = parseMetadataXml('<invalid>xml<');
            expect(result).toBeNull();
        });

        it('should return null for empty string', () => {
            const result = parseMetadataXml('');
            expect(result).toBeNull();
        });

        it('should store raw XML', () => {
            const result = parseMetadataXml(sampleMetadataXml);
            expect(result?.rawXml).toBe(sampleMetadataXml);
        });
    });

    describe('findEntityType', () => {
        it('should find entity type by short name', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = findEntityType(metadata, 'Product');
            expect(result?.name).toBe('Product');
        });

        it('should find entity type by full name', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = findEntityType(metadata, 'TestNamespace.Product');
            expect(result?.name).toBe('Product');
        });

        it('should return undefined for non-existent type', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = findEntityType(metadata, 'NonExistent');
            expect(result).toBeUndefined();
        });
    });

    describe('findEntitySet', () => {
        it('should find entity set by name', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = findEntitySet(metadata, 'Products');
            expect(result?.name).toBe('Products');
            expect(result?.entityType).toBe('TestNamespace.Product');
        });

        it('should return undefined for non-existent set', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = findEntitySet(metadata, 'NonExistent');
            expect(result).toBeUndefined();
        });
    });

    describe('getEntityTypeForSet', () => {
        it('should return entity type for entity set', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = getEntityTypeForSet(metadata, 'Products');
            expect(result?.name).toBe('Product');
        });

        it('should return undefined for non-existent set', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = getEntityTypeForSet(metadata, 'NonExistent');
            expect(result).toBeUndefined();
        });
    });

    describe('findFunctionImport', () => {
        it('should find function import by name', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = findFunctionImport(metadata, 'GetTopProducts');
            expect(result?.name).toBe('GetTopProducts');
        });

        it('should return undefined for non-existent function', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = findFunctionImport(metadata, 'NonExistent');
            expect(result).toBeUndefined();
        });
    });

    describe('findComplexType', () => {
        it('should find complex type by short name', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = findComplexType(metadata, 'Address');
            expect(result?.name).toBe('Address');
        });

        it('should find complex type by full name', () => {
            const metadata = parseMetadataXml(sampleMetadataXml)!;
            const result = findComplexType(metadata, 'TestNamespace.Address');
            expect(result?.name).toBe('Address');
        });
    });

    describe('extractServiceUrl', () => {
        it('should extract service URL from metadata URL', () => {
            const url = 'https://server.com/sap/opu/odata/sap/SERVICE_SRV/$metadata';
            expect(extractServiceUrl(url)).toBe('https://server.com/sap/opu/odata/sap/SERVICE_SRV');
        });

        it('should handle URL with trailing slash', () => {
            const url = 'https://server.com/service/$metadata/';
            expect(extractServiceUrl(url)).toBe('https://server.com/service');
        });

        it('should handle URL with query parameters', () => {
            const url = 'https://server.com/service/$metadata?sap-client=100';
            expect(extractServiceUrl(url)).toBe('https://server.com/service');
        });
    });
});
