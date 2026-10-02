"use client";
import handbook from "../../data/shisei_handbook.json";
import TextbookReader from "./textbook-reader";

export default function HandbookReader({initialTopic}:{initialTopic?:string}){return <TextbookReader handbook={handbook} initialTopic={initialTopic}/>;}
