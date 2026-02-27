package com.garment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.PurchaseEntryItem;

public interface PurchaseEntryItemRepository extends JpaRepository<PurchaseEntryItem, Long>{

    List<PurchaseEntryItem> findByPurchaseEntryPartyId(Long partyId);

}
