import _ from 'lodash';
import Promise from 'bluebird';
import path from 'path';
import { getSlugAndLang } from 'ptz-i18n';

const defaultOptions = {
  tagPage: 'src/templates/tag-page.js',
  tagsUrl: '/tags/',
  langKeyForNull: 'any',
  query: `
    {
      allMarkdownRemark {
        edges {
          node {
            fields {
              slug,
              langKey
            }
            frontmatter {
              tags
            }
          }
        }
      }
    }
  `
};

const logError = (e) => {
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
  console.log('i18n-tags error:');
  console.log(e);
  console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
};

exports.createPages = ({ graphql, boundActionCreators }, pluginOptions) => {
  const { createPage } = boundActionCreators;
  const options = {
    ...defaultOptions,
    ...pluginOptions
  };

  return new Promise((resolve, reject) => {
    const tagPage = path.resolve(options.tagPage);
    graphql(options.query).then(result => {
      try {

        if (result.errors) {
          throw result.errors;
        }

        const langTags = result.data.allMarkdownRemark.edges.reduce((tags, edge) => {
          const langKey = edge.node.fields.langKey;
          tags[langKey] = (tags[langKey] || []).concat(edge.node.frontmatter.tags);
          return tags;
        }, {});

        Object.keys(langTags).forEach(langKey => {
          const tags = _.uniq(langTags[langKey])
            .filter(tag => tag && tag !== '');

          tags.forEach(tag => {
            const tagPath = `/${langKey}${options.tagsUrl}${_.kebabCase(tag)}/`;
            createPage({
              path: tagPath,
              component: tagPage,
              context: {
                tag,
                langKey
              },
            });
          });
        });

        resolve();

      } catch (e) {
        logError(e);
        reject(e);
      }
    });
  });
};

// Add custom url pathname for blog posts.
exports.onCreateNode = ({ node, boundActionCreators, getNode }, pluginOptions) => {

  const options = {
    ...defaultOptions,
    ...pluginOptions
  };

  const { createNodeField } = boundActionCreators;

  if (node.frontmatter && node.frontmatter.tags &&
    node.fields && !node.fields.tagSlugs) {

    const slugAndLang = getSlugAndLang(options.langKeyForNull, node.fileAbsolutePath);

    const tagSlugs = node.frontmatter.tags.map(
      tag => {
        return {
          tag,
          link: `/${slugAndLang.langKey}${options.tagsUrl}${_.kebabCase(tag)}/`
        };
      }
    );
    createNodeField({ node, name: 'tagSlugs', value: tagSlugs });
  }
};
