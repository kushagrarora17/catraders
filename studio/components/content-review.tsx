import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {Card, Stack, Text, Heading, Badge, Box} from '@sanity/ui'
import type {UserViewComponent} from 'sanity/structure'
import {apiVersion} from '../env'

type Finding = {
  _key: string; kind: string; path: string; documentId: string; original: string;
  suggestion?: string; explanation: string; evidence?: {url: string; quote: string}[];
}
type Result = {
  status: string; reviewedAt?: string; sourceUpdatedAt?: string; coverage?: string;
  error?: string; findings?: Finding[];
}

function FindingCard({finding, productId}: {finding: Finding; productId?: string}) {
  return <Card padding={3} border radius={2}><Stack gap={3}>
      <Text weight="semibold">{finding.kind === 'unverified' ? 'Unable to verify' : finding.kind}</Text>
      <Text size={1}>{finding.path}{finding.documentId !== productId ? ` — shared document: ${finding.documentId}` : ''}</Text>
      <Text>Current: {finding.original}</Text>
      {finding.suggestion && <Text>Suggestion: {finding.suggestion}</Text>}
      <Text>{finding.explanation}</Text>
      {finding.evidence?.map((source, i) => <Box key={i}><Stack gap={2}>
        <Text size={1}>{source.quote}</Text>
        <Text size={1}><a href={source.url} target="_blank" rel="noreferrer">Manufacturer reference</a></Text>
      </Stack></Box>)}
    </Stack></Card>
}

function reviewStatus(result: Result | undefined, latest: string | undefined) {
  if (!result) return 'pending'
  if (result.status === 'complete' && latest && (!result.sourceUpdatedAt || latest > result.sourceUpdatedAt)) return 'outdated'
  return result.status
}

function ReviewDetails({result, latest, error}: {result?: Result; latest?: string; error?: string}) {
  const status = reviewStatus(result, latest)
  return <>
    <Text><Badge tone={status === 'failed' ? 'critical' : status === 'complete' ? 'positive' : 'caution'}>{status}</Badge></Text>
    <Text size={1}>Reviews run after saved edits. Make corrections in the product editor; publishing remains available.</Text>
    {error && <Text>{error}</Text>}
    {!result && <Text>No review yet. New saved changes are reviewed when the review service is enabled.</Text>}
    {status === 'outdated' && <Text>This review covers an older version. A new review is pending.</Text>}
    {result?.error && <Text>{result.error}</Text>}
    {result?.reviewedAt && <Text size={1}>Last reviewed: {new Date(result.reviewedAt).toLocaleString()}</Text>}
    {result?.coverage && <Text size={1}>{result.coverage}</Text>}
    {result?.status === 'complete' && !result.findings?.length && <Text>No issues detected within the stated coverage.</Text>}
  </>
}

export const ContentReview: UserViewComponent = ({document}) => {
  const client = useClient({apiVersion})
  const id = document.displayed?._id?.replace(/^drafts\./, '')
  const updatedAt = document.displayed?._updatedAt
  const [state, setState] = useState<{result?: Result; latest?: string; error?: string}>({})
  useEffect(() => {
    if (!id) return
    let active = true
    const refresh = async () => {
      try {
        const data = await client.fetch<{review?: Result; dates: (string | null)[]}>(`{
          "review": *[_type == "contentReview" && vertical == "automotive" && _id == $reviewId][0],
          "dates": *[_type == "product" && vertical == "automotive" && _id == $id][0]{
            "values": [_updatedAt, category->_updatedAt] + coalesce(attributeValues[]->_updatedAt, []) + coalesce(attributeValues[]->attribute->_updatedAt, [])
          }.values
        }`, {id, reviewId: `contentReview.${id}`}, {perspective: 'drafts'})
        if (active) setState({result: data.review, latest: (data.dates ?? []).filter((d): d is string => Boolean(d)).sort().at(-1)})
      } catch {
        if (active) setState(previous => ({...previous, error: 'Could not load the review. Retrying shortly.'}))
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 5000)
    return () => { active = false; clearInterval(timer) }
  }, [client, id, updatedAt])
  return <Card padding={4}><Stack gap={4}>
    <Heading size={2}>AI content review</Heading>
    <ReviewDetails result={state.result} latest={state.latest} error={state.error} />
    {state.result?.findings?.map(finding => <FindingCard key={finding._key} finding={finding} productId={id} />)}
  </Stack></Card>
}
