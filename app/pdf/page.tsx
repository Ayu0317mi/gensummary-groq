'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { generateCVSummary } from '../actions/pdf/generate'
import { Input } from '@/components/ui/input'
import * as pdfjsLib from 'pdfjs-dist'  // Correct import for pdfjs-dist
import 'pdfjs-dist/webpack'

export default function CVSummaryGenerator() {
    const [cv, setCV] = useState('')
    const [summary, setSummary] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [file, setFile] = useState<File | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0]
        if (uploadedFile) {
            setFile(uploadedFile)
            await extractTextFromPDF(uploadedFile)
        }
    }

    // Function to extract text from uploaded PDF using pdf.js
    const extractTextFromPDF = async (pdfFile: File) => {
        try {
            const fileReader = new FileReader()
            fileReader.onload = async () => {
                const arrayBuffer = fileReader.result as ArrayBuffer

                // Initialize PDF.js document from the loaded ArrayBuffer
                const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise
                let text = ''
                const numPages = pdfDoc.numPages

                // Iterate through all pages and extract text
                for (let i = 1; i <= numPages; i++) {
                    const page = await pdfDoc.getPage(i)
                    const content = await page.getTextContent()

                    // Join all the items in the page text
                    text += content.items.map((item: any) => item.str).join(' ') + '\n'
                }

                // Set the extracted text to the CV state
                setCV(text)
            }
            fileReader.readAsArrayBuffer(pdfFile)
        } catch (error) {
            console.error("Error extracting PDF text:", error)
            setErrorMessage("Failed to extract text from the PDF. Please try again.")
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setErrorMessage('')
        setSummary('')
        if (!cv.trim()) {
            setErrorMessage("Please upload or extract your CV before generating a summary.")
            return
        }
        setIsLoading(true)
        try {
            const stream = await generateCVSummary(cv)
            const reader = stream.getReader()
            const decoder = new TextDecoder()
            let accumulatedSummary = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value)
                accumulatedSummary += chunk
                setSummary(accumulatedSummary)
            }
        } catch (error) {
            console.error("Error generating summary:", error)
            setErrorMessage("An error occurred while generating the summary. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>CV Input</CardTitle>
                        <CardDescription>Upload your CV file (PDF) or paste your CV and get an AI-generated summary</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent>
                            {/* Custom File Input */}
                            <div className="mb-4">
                                <Input
                                    id="file-input"
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="file-input"
                                    className="inline-block py-2 px-4 bg-black text-white font-normal rounded-lg cursor-pointer text-sm"
                                >
                                    Upload file
                                </label>
                                {/* Display selected file name */}
                                {file && (
                                    <p className="text-sm text-muted-foreground mt-2">Selected file:{file.name}</p>
                                )}
                            </div>

                            <Textarea
                                placeholder="Paste your CV here..."
                                value={cv}
                                onChange={(e) => setCV(e.target.value)}
                                rows={5}
                                className="w-full mb-4"
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Generating...' : 'Generate Summary'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Generated Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {errorMessage && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                        )}
                        {summary ? (
                            <p className="whitespace-pre-wrap">{summary}</p>
                        ) : (
                            <p className="text-muted-foreground">Your summary will appear here...</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}