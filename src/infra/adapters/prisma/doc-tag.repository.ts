/**
 * DocTag Repository - Prisma Adapter
 * Handles CRUD operations for document tags and their assignments
 */
import type { PrismaClient, DocTag as PrismaDocTag, DocTagAssignment as PrismaDocTagAssignment } from '@prisma/client';

export interface DocTag {
    id: string;
    name: string;
    projectId: string;
    orgId: string;
    createdAt: Date;
}

export interface CreateDocTagInput {
    orgId: string;
    projectId: string;
    name: string;
}

export interface DocTagWithCount extends DocTag {
    _count: {
        assignments: number;
    };
}

export class DocTagRepository {
    constructor(private prisma: PrismaClient) { }

    /**
     * Create a new tag for a project
     */
    async create(data: CreateDocTagInput): Promise<DocTag> {
        return this.prisma.docTag.create({
            data: {
                orgId: data.orgId,
                projectId: data.projectId,
                name: data.name.trim(),
            },
        });
    }

    /**
     * Find tag by ID
     */
    async findById(id: string, orgId: string): Promise<DocTag | null> {
        return this.prisma.docTag.findFirst({
            where: { id, orgId },
        });
    }

    /**
     * Find all tags for a project
     */
    async findByProjectId(projectId: string, orgId: string): Promise<DocTagWithCount[]> {
        return this.prisma.docTag.findMany({
            where: { projectId, orgId },
            include: {
                _count: {
                    select: { assignments: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Find tag by name within a project (for uniqueness check)
     * Case-insensitive comparison
     */
    async findByName(name: string, projectId: string, orgId: string): Promise<DocTag | null> {
        return this.prisma.docTag.findFirst({
            where: {
                name: {
                    equals: name.trim(),
                    mode: 'insensitive',
                },
                projectId,
                orgId,
            },
        });
    }

    /**
     * Delete a tag (assignments cascade automatically)
     */
    async delete(id: string, orgId: string): Promise<void> {
        const existing = await this.findById(id, orgId);
        if (!existing) {
            throw new Error('DocTag not found');
        }

        await this.prisma.docTag.delete({
            where: { id },
        });
    }

    /**
     * Assign a tag to a document (idempotent - ignores if already exists)
     */
    async assignToDoc(docId: string, tagId: string): Promise<void> {
        await this.prisma.docTagAssignment.upsert({
            where: {
                docId_tagId: { docId, tagId },
            },
            create: {
                docId,
                tagId,
            },
            update: {}, // No-op if already exists
        });
    }

    /**
     * Remove a tag from a document
     */
    async unassignFromDoc(docId: string, tagId: string): Promise<void> {
        await this.prisma.docTagAssignment.deleteMany({
            where: { docId, tagId },
        });
    }

    /**
     * Get all tags for a specific document
     */
    async findTagsByDocId(docId: string, orgId: string): Promise<DocTag[]> {
        const assignments = await this.prisma.docTagAssignment.findMany({
            where: {
                docId,
                tag: { orgId },
            },
            include: {
                tag: true,
            },
        });

        return assignments.map((a) => a.tag);
    }

    /**
     * Get all document IDs that have a specific tag
     */
    async findDocIdsByTagId(tagId: string, orgId: string): Promise<string[]> {
        const assignments = await this.prisma.docTagAssignment.findMany({
            where: {
                tagId,
                tag: { orgId },
            },
            select: { docId: true },
        });

        return assignments.map((a) => a.docId);
    }

    /**
     * Bulk assign tags to a document
     */
    async bulkAssignToDoc(docId: string, tagIds: string[]): Promise<void> {
        // Use transaction for atomicity
        await this.prisma.$transaction(
            tagIds.map((tagId) =>
                this.prisma.docTagAssignment.upsert({
                    where: { docId_tagId: { docId, tagId } },
                    create: { docId, tagId },
                    update: {},
                })
            )
        );
    }

    /**
     * Replace all tags on a document with new set
     */
    async setDocTags(docId: string, tagIds: string[]): Promise<void> {
        await this.prisma.$transaction([
            // Remove all existing assignments
            this.prisma.docTagAssignment.deleteMany({
                where: { docId },
            }),
            // Add new assignments
            ...tagIds.map((tagId) =>
                this.prisma.docTagAssignment.create({
                    data: { docId, tagId },
                })
            ),
        ]);
    }
}
