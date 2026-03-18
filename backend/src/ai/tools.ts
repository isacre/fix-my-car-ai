import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChromaService } from 'src/chroma/chroma.service';
import axios from 'axios';
import * as cheerio from 'cheerio';

export function createAITools(chromeService: ChromaService) {
  const searchVectorDatabaseTool = tool(
    async ({ query }) => {
      const { documents } = await chromeService.queryDocuments(query);
      if (!documents.length) {
        return 'No documents found in the vector database';
      }
      return documents.join('\n---\n');
    },
    {
      name: 'search_vector_database',
      description: 'Search for context in the vector database.',
      schema: z.object({
        query: z
          .string()
          .describe(
            'The technical search term or user question to search the vector database for',
          ),
      }),
    },
  );

  const searchInternetTool = tool(
    async () => {
      try {
        return 'No results found for this search query.';
      } catch (error) {
        return `Search failed: ${error.message}`;
      }
    },
    {
      name: 'search_internet',
      description: '',
      schema: z.object({
        query: z.string().describe('The question to search the internet for'),
      }),
    },
  );

  const tools = [searchVectorDatabaseTool, searchInternetTool];

  return tools;
}
