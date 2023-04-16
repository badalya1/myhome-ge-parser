import * as fs from 'fs';
import puppeteer from 'puppeteer';
import { Page } from "puppeteer";
// read lines from links.txt
// create a new instance of the crawler
interface ContactInfo {
    name: string;
    number: string;
    title: string;
}

type FinishType = "new" | "old";


interface PostingInfo {
    url: string;
    id: string;
    title: string;
    finish_type: FinishType;
    address: string;
    price: string;
    price_currency: string;
    area: string;
    area_unit: string;
    price_per_unit: string;
    contact: ContactInfo;
    lng: string;
    lat: string;
    description: string;
    rooms: number;
    bedrooms: number;
    floor: string;
}


const querySelector = async (page: Page, selector: string) => {
    const el = await page.waitForSelector(selector);
    if (!el) throw new Error(`Could not find selector ${selector}`);
    return el;
}



const fetchPage = async (url: string) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const postingInfo = {
        url
    } as PostingInfo;
    await page.goto(url);

    console.log("Fetching: ", url);
    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });
    // const content = await page.evaluate(() => {
    //     for (const svg of document.body.querySelectorAll('svg')) svg.remove();
    //     for (const script of document.body.querySelectorAll('script')) script.remove();
    //     console.log(document.querySelector('.address'));

    //     return document.body;
    // });

    // Wait for the required DOM to be rendered
    postingInfo.id = (await (await querySelector(page, '.id-container')).evaluate(el => el.children[1].innerHTML)).trim();
    postingInfo.address = (await (await querySelector(page, '.address')).evaluate(el => el.innerHTML)).trim();
    const title = await (await querySelector(page, '.statement-title')).evaluate(el => el.children[0].innerHTML);
    postingInfo.title = title;
    // if title contains "Older"
    if (title.includes("Older")) {
        postingInfo.finish_type = "old";
    } else if (title.includes("New")) {
        postingInfo.finish_type = "new";
    }




    const mainInfo = await (await querySelector(page, '.main-features')).evaluate(el => {
        const rooms = el.children[0].children[1].children[1].innerHTML;
        const bedrooms = el.children[1].children[1].children[0].innerHTML;
        const floor = el.children[2].children[1].children[0].innerHTML;
        return { rooms, bedrooms, floor };
    });

    postingInfo.rooms = parseInt(mainInfo.rooms);
    postingInfo.bedrooms = parseInt(mainInfo.bedrooms);
    postingInfo.floor = mainInfo.floor.trim();

    postingInfo.description = await page.evaluate(() => {
        return document.querySelector(".pr-comment.translated")?.innerHTML ?? "";
    })

    const priceInfo = await (await querySelector(page, '.price-toggler-wrapper')).evaluate(el => {
        console.log(el.innerHTML);
        const price = el.children[0].children[0].children[0].getAttribute('data-price-usd')!;
        const price_currency = "USD"
        const [, area, area_unit] = el.children[1].children[0].textContent!.split(" ");
        const price_per_unit = el.children[2].children[0].children[0].getAttribute('data-price-usd')!;
        return { price, price_currency, area, area_unit, price_per_unit };
    });

    postingInfo.price = priceInfo.price;
    postingInfo.price_currency = priceInfo.price_currency;
    postingInfo.area = priceInfo.area;
    postingInfo.area_unit = priceInfo.area_unit;
    postingInfo.price_per_unit = priceInfo.price_per_unit


    const contactInfo = await (await querySelector(page, '.agent')).evaluate(el => {
        const name = el.querySelector(".name")!.innerHTML;
        const title = el.children[0].children[1].children[0].innerHTML;
        return { name, title };
    });

    await page.evaluate(() => {
        const button = document.querySelector(".phone-btn") as HTMLButtonElement;
        button.click();
    })

    const number = await (await querySelector(page, "#PhoneModal > div:nth-child(1) > a")).evaluate(el => el.innerHTML);


    postingInfo.contact = { ...contactInfo, number };


    console.log(postingInfo);
    await browser.close();
};



const main = async () => {
    const links = fs.readFileSync('./links.txt', 'utf-8').split('\n');
    for (const link of links) {
        await fetchPage(link);
    }
}

main()