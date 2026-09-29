# Finding people

Finding the right person and a real address is a graph search. Entry points put the first
people on the frontier. Every grounded person is a lead to their neighbours: coauthors,
people who commit to the same code, labmates, the company they work at. A traversal policy
picks which lead to open next, and a stopping rule ends the walk. What comes out is a short
list, each person resting on a dated first-party source for who they are and another for
where the address came from.

The skills that reach people use this file: `role-outreach` to find a role's owner,
`role-sourcing` for the people behind a company, `industry-research` for who is worth
talking to in a field. `outbound-sourcing` (github.com/jaisharmz/outbound-sourcing)
implements it with scripts and a people graph that persists between runs.

## Entry points

There is no privileged first move. Start wherever is cheapest for the target, and expect
to use more than one.

| entry point | what it gives | where |
| --- | --- | --- |
| search dorks | names, titles and personal pages at a company | the queries below |
| papers | authors who name the company as their affiliation, their coauthors, and often their addresses under the title | arXiv, OpenAlex, Semantic Scholar, DBLP, Google Scholar |
| code | the people behind a company's open source, and the domain's address convention | GitHub org members, contributors and commits; Hugging Face org members |
| company pages | the team as the company presents it | `/team`, `/about`, `/research`, `/people`, job posts that name a hiring manager |
| talks and programmes | who is active, and who is senior | conference speaker and program-committee pages, podcasts, patents' inventor lists |
| fund portfolios | companies with their founders attached | the fund's own portfolio page |
| people databases | an address for a named person at a named company | Apollo, RocketReach, Hunter, ContactOut and similar, used last |
| the operator's own network | the warmest paths there are | ask: mutual connections, former colleagues, labmates, alumni who actually know them |

**Dorks** are seeds to improvise from, not a script:

```
site:github.io "{company}"                                  personal research pages
site:github.io "{company}" "phd"
site:linkedin.com/in "{company}" "research scientist"       names and titles, from the snippets
site:scholar.google.com "Verified email at {domain}"        researchers verified at the company
site:arxiv.org "{company}"                                  papers with the company as an affiliation
filetype:pdf "{domain}"                                     papers, CVs and slides that print the domain
"{company}" ("members of technical staff" OR "our team" OR "our research")
```

**Papers.** `https://api.openalex.org/works?filter=raw_affiliation_strings.search:{company}`
lists authors who typed the company as their own affiliation, which finds researchers no
team page names. For an author's current employer, read `affiliations[]` and rank it by
sustained recency (how many of the last three years), never `last_known_institutions[0]`,
whose order is not recency. An author whose works count is far out of line with their
career stage is two people merged into one record. Google Scholar blocks automated
reading, so use its search-result snippets, or OpenAlex and Semantic Scholar, which have
APIs. A CAPTCHA is a stop, never something to solve.

**Code.** A company's GitHub org lists its public members, and its main repositories list
their contributors (`/repos/{owner}/{repo}/contributors`). Profiles link personal sites,
which carry the rest. Commit author emails (`/repos/{owner}/{repo}/commits`) show the
domain's address convention. A commit proves an address existed when it landed, not that
the person is still there, so a commit older than about two years is pattern evidence
only. Unauthenticated GitHub allows 60 requests an hour, and a throttled call is not an
empty org. Hugging Face lists org members at
`https://huggingface.co/api/organizations/{slug}/members`.

**People databases** sell what the rest of this file derives: an address for a named
person. Reach for one only after the free channels are exhausted for that person, record
the address as `purchased` with the vendor's result page as its source, and verify it like
any other. Hunter's domain search is worth a look earlier, because it shows a domain's
convention together with the pages it saw each address on, which is grounding rather than
a bare claim.

## Expansion: every result is a lead

The walk asks one question per step: what is the next investigation that gets closer to a
grounded contact? A partial result is a lead, not a dead end.

| what you have | what it is a lead to |
| --- | --- |
| a personal page with no address | its Scholar link, or the person's papers |
| a Scholar or OpenAlex profile | the papers it lists, and their coauthors |
| a paper printing company addresses | the addresses, and every coauthor |
| a GitHub profile | its personal site, its org, and the people who commit to the same repositories |
| a name and no address | the domain's convention, learned from commits or a paper |
| an address and no role | the team page, the person's own page, their recent papers |
| a grounded person | their coauthors and co-contributors, at their company and at others |
| a collaborator at a company not yet opened | that company, as a new target |

The edges run two ways, and both are worth walking. **Sideways**, a coauthor at the same
company is another person on the team. **Outward**, a coauthor's employer is a company that
demonstrably employs people doing the work, which beats any list.

## The walk: breadth-first, depth-first, best-first

Nodes are people, papers, repositories, labs and companies. Edges are coauthored,
committed to the same repository, advised, member of a lab, works at, founded and
invested in.

- **Breadth-first, for coverage.** To map one company or lab and answer "who works on X
  at Y", expand every person one hop before going two, and follow only the edges that stay
  inside it.
- **Depth-first, for one person.** To reach someone specific, such as the owner of a role,
  follow the strongest thread (the team's newest paper on the exact topic, the repository
  the job post mentions) until a title fits, and back up at a dead end.
- **Best-first, by default.** Keep the frontier in order and always open the most
  promising lead. Score each one on how many independent paths reach it, how recent its
  evidence is, how closely it matches the target topic, whether its seniority fits, and
  whether an address looks findable. Re-score after each expansion.

On the companies measured so far, a company seed yielded its own people through the
affiliation query, and one hop outward returned the surrounding research community rather
than more employees. So expand sideways to fill in a company, outward to find new
companies, and deep for a person or a lab, where the graph is dense.

**Stop on either of two limits:** a budget of steps, or several consecutive steps that
yield neither a person nor a lead. Budget alone lets one rich seed spend everything on one
company, and dryness alone never ends on a coauthor graph. Stop when the yield collapses,
not at a hop count.

Log every step. A contact whose derivation cannot be read cannot be checked.

## Resolving an address

In this order, and never invent one:

1. **Observed** on a page the person controls: a personal site, a CV, a lab page.
2. **On a paper's first page**, where author addresses sit under the title: the channel
   for systems and hardware people, who publish but rarely keep a personal page.
3. **Inferred from the pattern.** One real address at the domain, in a document that also
   names its owner, gives the convention (`first@`, `first.last@`, `flast@`). Apply it to
   other confirmed names there and mark those addresses inferred. Never infer from one
   sighting at a large company, and never across subdomains.
4. **Purchased**, from a people database, and marked as such.

One observed address usually gives the rest of the team, which is why step 3 pays for the
whole search. Verify every address before anything is drafted to it.

Pick the channel from the population. Researchers who publish keep personal pages.
Systems and hardware engineers publish papers with their addresses in them. People at
product companies that do not publish have neither, and need another way in: the team
page and the pattern, a warm introduction, or the application itself.

## Traps

The failure here is rarely an error. It is a confident, well-formed, wrong answer that
passes review because nothing on its surface is objectionable.

- **Namesakes.** A guessed page for a common name can belong to someone else, and a
  company name can belong to two companies. Accept a page only when it also names the
  company.
- **Converted pages hide data.** WebFetch renders pages to markdown, and a roster kept in
  a `data-` attribute or a framework's JSON disappears. When a page returns less than it
  should, `curl` the raw HTML before concluding anything.
- **Throttled is not empty**, and an invited talk is not employment.
- **Role accounts and traps.** `careers@`, `info@` and addresses planted for scrapers are
  not people.

The defence against all of them is a second, independent source for the claim before it
becomes a contact.

## Limits

- Public professional information only: where someone works, what they have published, a
  work address or one they published themselves. No home addresses, personal phone numbers
  or anything about their private life.
- LinkedIn is read from search-result snippets. Do not fetch, crawl or automate
  linkedin.com. When a signed-in read is needed, the operator does it by hand.
- Check prior contact before researching anyone: search the sending mailbox's Sent folder
  by domain and by name. Honour anyone who asked not to be contacted.
- Finding a person is not permission to write to them. Nothing is sent without the
  operator's approval of that specific message.
