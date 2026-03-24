import { ChartPie, Target, TrendingUpDown, Workflow } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function HomepageCards() {
    return (
        <aside className="bg-secondary/80 p-6 dark:bg-background/80 md:p-10">
            <div className="mx-auto grid w-full max-w-[1500px] animate-fade-in-up grid-cols-1 items-start gap-8 xl:grid-cols-12 xl:gap-10">
                <div className="xl:col-span-6 my-auto">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                        System Purpose
                    </h2>
                    <p className="mt-6 max-w-3xl text-base leading-relaxed text-foreground sm:text-lg">
                        The Smart Human Resource Management System (HRMS) is established to enhance the efficiency, transparency, and standardization of human resource processes, and is provided as a free public service initiative to support streamlined administrative operations and promote accessible, reliable, and accountable HR management.
                    </p>
                </div>

                <Tabs defaultValue="routing" className="mx-auto w-full max-w-3xl animate-fade-in-up xl:col-span-6 xl:mx-0 xl:max-w-none">
                    <TabsList className="!grid !h-auto min-h-0 w-full grid-cols-2 auto-rows-fr gap-2 overflow-y-hidden p-1 sm:grid-cols-4">
                        <TabsTrigger value="routing" className="h-auto min-w-0 px-3 py-2 text-xs sm:px-4 sm:text-sm data-[state=active]:bg-secondary/80 data-[state=active]:text-foreground dark:data-[state=active]:bg-background/80">
                            <Workflow className="mr-2 size-4" />
                            Routing
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="h-auto min-w-0 px-3 py-2 text-xs sm:px-4 sm:text-sm data-[state=active]:bg-secondary/80 data-[state=active]:text-foreground dark:data-[state=active]:bg-background/80">
                            <TrendingUpDown className="mr-2 size-4" />
                            Performance
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="h-auto min-w-0 px-3 py-2 text-xs sm:px-4 sm:text-sm data-[state=active]:bg-secondary/80 data-[state=active]:text-foreground dark:data-[state=active]:bg-background/80">
                            <ChartPie className="mr-2 size-4" />
                            Analytics
                        </TabsTrigger>
                        <TabsTrigger value="training" className="h-auto min-w-0 px-3 py-2 text-xs sm:px-4 sm:text-sm data-[state=active]:bg-secondary/80 data-[state=active]:text-foreground dark:data-[state=active]:bg-background/80">
                            <Target className="mr-2 size-4" />
                            Training
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="routing" className="mt-4">
                        <Card className="animate-card-pop w-full rounded-xl bg-card transition-shadow duration-300 hover:shadow-md">
                            <Workflow className="mx-auto mt-8 size-14 rounded-xl bg-primary/10 p-3 text-primary" />
                            <CardHeader className="px-6 pb-0 pt-6 text-center lg:px-10">
                                <CardTitle className="text-lg sm:text-xl">Workflow Routing</CardTitle>
                                <CardDescription>Rule-based document processing and decision trees</CardDescription>
                            </CardHeader>
                            <CardContent className="px-6 pb-8 pt-6 text-base leading-relaxed lg:px-10">
                                Streamlining document process flow, by automating Leave Application processing and routing the IPCR Form to the appropriate evaluator.
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="performance" className="mt-4">
                        <Card className="animate-card-pop w-full rounded-xl bg-card transition-shadow duration-300 hover:shadow-md">
                            <TrendingUpDown className="mx-auto mt-8 size-14 rounded-xl bg-primary/10 p-3 text-primary" />
                            <CardHeader className="px-6 pb-0 pt-6 text-center lg:px-10">
                                <CardTitle className="text-lg sm:text-xl">Performance Prediction</CardTitle>
                                <CardDescription>Trend analysis via linear regression</CardDescription>
                            </CardHeader>
                            <CardContent className="px-6 pb-8 pt-6 text-base leading-relaxed lg:px-10">
                                Utilizing 3 to 5 years of employee data (Quarterly Performance and Performance Rating) to predict employee performance trends.
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="analytics" className="mt-4">
                        <Card className="animate-card-pop w-full rounded-xl bg-card transition-shadow duration-300 hover:shadow-md">
                            <ChartPie className="mx-auto mt-8 size-14 rounded-xl bg-primary/10 p-3 text-primary" />
                            <CardHeader className="px-6 pb-0 pt-6 text-center lg:px-10">
                                <CardTitle className="text-lg sm:text-xl">HR Analytics Dashboard</CardTitle>
                                <CardDescription>Live operational metrics via FlatFAT</CardDescription>
                            </CardHeader>
                            <CardContent className="px-6 pb-8 pt-6 text-base leading-relaxed lg:px-10">
                                Displays live HR aggregated operational metrics, including Employee Attendance from the Biometrics System Database.
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="training" className="mt-4">
                        <Card className="animate-card-pop w-full rounded-xl bg-card transition-shadow duration-300 hover:shadow-md">
                            <Target className="mx-auto mt-8 size-14 rounded-xl bg-primary/10 p-3 text-primary" />
                            <CardHeader className="px-6 pb-0 pt-6 text-center lg:px-10">
                                <CardTitle className="text-lg sm:text-xl">Training Recommendations</CardTitle>
                                <CardDescription>Content-based filtering for skill gaps</CardDescription>
                            </CardHeader>
                            <CardContent className="px-6 pb-8 pt-6 text-base leading-relaxed lg:px-10">
                                Suggests relevant training programs based on competency gaps from specific areas derived from the evaluation form (IPCR).
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </aside>
    );
}
