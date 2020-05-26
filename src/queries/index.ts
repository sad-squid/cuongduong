import { graphql } from 'gatsby';

// export const siteMetadataTitleQuery = graphql`
//   fragment siteMetadataTitleQuery on Query {
//     site {
//       siteMetadata {
//         title
//       }
//     }
//   }
// `;
export const homePageLogoP1Query = graphql`
  fragment homePageLogoP1Query on Query {
    logop1: file(relativePath: { eq: "iconp1.png" }) {
      childImageSharp {
        fluid(maxHeight: 152) {
          ...GatsbyImageSharpFluid
        }
      }
    }
  }
`;

export const homePageLogoP2Query = graphql`
  fragment homePageLogoP2Query on Query {
    logop2: file(relativePath: { eq: "iconp2.png" }) {
      childImageSharp {
        fluid(maxHeight: 152) {
          ...GatsbyImageSharpFluid
        }
      }
    }
  }
`;

export const githubLogoQuery = graphql`
  fragment githubLogoQuery on Query {
    githubLogo: file(relativePath: { eq: "GitHub-Mark-Light-64px.png" }) {
      childImageSharp {
        fluid(maxHeight: 64) {
          ...GatsbyImageSharpFluid
        }
      }
    }
  }
`;

export const twitterLogoQuery = graphql`
  fragment twitterLogoQuery on Query {
    twitterLogo: file(relativePath: { eq: "Twitter_Logo_WhiteOnImage.png" }) {
      childImageSharp {
        fluid(maxHeight: 64) {
          ...GatsbyImageSharpFluid
        }
      }
    }
  }
`;

export const instagramLogoQuery = graphql`
  fragment instagramLogoQuery on Query {
    instagramLogo: file(relativePath: { eq: "IG_Glyph_Fill.png" }) {
      childImageSharp {
        fluid(maxHeight: 64) {
          ...GatsbyImageSharpFluid
        }
      }
    }
  }
`;
