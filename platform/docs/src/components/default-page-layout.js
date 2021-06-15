import * as React from 'react';
import { useStaticQuery, graphql, Link } from "gatsby"
import Header from './header.js';
import Footer from './footer.js';
import './default-page-layout.scss';

function DefaultPageLayout ({ children, ...rest }) {
  return (
    <>
      <Header />

      {/* POSITIONING */}
      <div className="container" style={{ marginTop: '40px' }}>
        {/* LAYOUT */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
        }}>
          {/* LEFT - Nav */}
          <Navigation />
          {/* RIGHT - Main */}
          <main

          >
            {children}
          </main>
        </div>
      </div>

      <Footer />
    </>
  )
}

const query = graphql`{
  allMdx {
    edges {
      node {
        slug
        id
        frontmatter {
          title
        }
      }
    }
  }
}
`


function Navigation() {
  const data = useStaticQuery(query)
  return (
      <nav style={{ minWidth: '273px', maxWidth: '273px', paddingLeft: '28px' }}>
        <ul>
          {data.allMdx.edges.map(edge => {
            const lnk = edge.node;
            const title = lnk.frontmatter.title || lnk.slug;

            return (
              <li style={{ paddingLeft: '30px' }}>
                <Link to={`/${lnk.slug}`}>{title}</Link>
              </li>
            );
          })}
        </ul>
      </nav>
  )
}
export default DefaultPageLayout;
